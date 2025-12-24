import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoringConfig, providerRates, ratebookImports } from "@/lib/db/schema";
import { sql, eq, desc, and, gte, lte } from "drizzle-orm";
import type { ScoringWeights, ScoreThresholds } from "@/lib/db/schema";

// Ratio bands define how cost ratios map to scores
export type RatioBand = {
  maxRatio: number;
  score: number;
};

const DEFAULT_WEIGHTS: ScoringWeights = {
  valueScore: 100,
  providerCompetition: 0,
  rateFreshness: 0,
};

const DEFAULT_THRESHOLDS: ScoreThresholds = {
  hot: { min: 80, label: "Exceptional" },
  great: { min: 65, label: "Great" },
  good: { min: 50, label: "Good" },
  fair: { min: 40, label: "Fair" },
  average: { min: 0, label: "Poor" },
};

const DEFAULT_RATIO_BANDS: RatioBand[] = [
  { maxRatio: 0.20, score: 95 },
  { maxRatio: 0.28, score: 80 },
  { maxRatio: 0.38, score: 65 },
  { maxRatio: 0.48, score: 50 },
  { maxRatio: 0.58, score: 40 },
  { maxRatio: 0.70, score: 25 },
  { maxRatio: 999, score: 10 },
];

/**
 * GET /api/admin/scoring/config
 *
 * Returns current scoring configuration and score distribution from stored scores.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const contractType = searchParams.get("contractType") || "CHNM";
    const term = parseInt(searchParams.get("term") || "36");
    const mileage = parseInt(searchParams.get("mileage") || "10000");

    // Get active config
    const configs = await db
      .select()
      .from(scoringConfig)
      .where(eq(scoringConfig.isActive, true))
      .orderBy(desc(scoringConfig.createdAt))
      .limit(1);

    const activeConfig = configs[0];

    // Get score distribution directly from stored scores (overall, not filtered by term/mileage)
    // This gives a better picture of the scoring distribution across all rates
    const distributionResult = await db
      .select({
        tier: sql<string>`CASE
          WHEN ${providerRates.score} >= 80 THEN 'hot'
          WHEN ${providerRates.score} >= 65 THEN 'great'
          WHEN ${providerRates.score} >= 50 THEN 'good'
          WHEN ${providerRates.score} >= 40 THEN 'fair'
          ELSE 'average'
        END`,
        count: sql<number>`count(DISTINCT ${providerRates.capCode})`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true))
      .groupBy(sql`1`);

    const distribution: Record<string, number> = {
      hot: 0,
      great: 0,
      good: 0,
      fair: 0,
      average: 0,
    };

    for (const row of distributionResult) {
      distribution[row.tier] = Number(row.count);
    }

    // Get sample vehicles with best scores
    const sampleVehicles = await db
      .select({
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        totalRental: providerRates.totalRental,
        p11d: providerRates.p11d,
        score: providerRates.score,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(ratebookImports.isLatest, true),
          eq(providerRates.contractType, contractType),
          eq(providerRates.term, term),
          eq(providerRates.annualMileage, mileage)
        )
      )
      .orderBy(desc(providerRates.score))
      .limit(20);

    const formattedSamples = sampleVehicles.map((v) => ({
      capCode: v.capCode,
      manufacturer: v.manufacturer,
      model: v.model,
      variant: v.variant,
      displayName: v.variant
        ? `${v.manufacturer} ${v.model} ${v.variant}`
        : `${v.manufacturer} ${v.model}`,
      monthlyPriceGbp: v.totalRental ? Math.round(v.totalRental / 100) : null,
      p11dGbp: v.p11d ? Math.round(v.p11d / 100) : null,
      score: v.score,
    }));

    return NextResponse.json({
      config: {
        id: activeConfig?.id || null,
        name: activeConfig?.name || "default",
        weights: activeConfig?.weights || DEFAULT_WEIGHTS,
        thresholds: activeConfig?.thresholds || DEFAULT_THRESHOLDS,
        ratioBands: (activeConfig as { ratioBands?: RatioBand[] })?.ratioBands || DEFAULT_RATIO_BANDS,
      },
      distribution,
      totalVehicles: Object.values(distribution).reduce((a, b) => a + b, 0),
      sampleVehicles: formattedSamples,
      appliedFilters: {
        contractType,
        term,
        mileage,
      },
    });
  } catch (error) {
    console.error("Error fetching scoring config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/scoring/config
 *
 * Update scoring configuration and recalculate all scores.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { weights, thresholds, ratioBands, name } = body;

    // Validate ratio bands if provided
    if (ratioBands) {
      if (!Array.isArray(ratioBands) || ratioBands.length === 0) {
        return NextResponse.json(
          { error: "ratioBands must be a non-empty array" },
          { status: 400 }
        );
      }
      for (const band of ratioBands) {
        if (typeof band.maxRatio !== "number" || typeof band.score !== "number") {
          return NextResponse.json(
            { error: "Each ratio band must have maxRatio and score as numbers" },
            { status: 400 }
          );
        }
      }
    }

    // Deactivate existing configs
    await db
      .update(scoringConfig)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(scoringConfig.isActive, true));

    // Create new config with ratio bands
    const [newConfig] = await db
      .insert(scoringConfig)
      .values({
        name: name || "custom",
        weights: weights || DEFAULT_WEIGHTS,
        thresholds: thresholds || DEFAULT_THRESHOLDS,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    // Update ratio_bands separately (since it's a new column)
    if (ratioBands) {
      await db.execute(
        sql`UPDATE scoring_config SET ratio_bands = ${JSON.stringify(ratioBands)}::jsonb WHERE id = ${newConfig.id}`
      );
    }

    // Trigger score recalculation
    const recalcResult = await db.execute(
      sql`SELECT * FROM recalculate_all_scores()`
    );

    const recalcStats = recalcResult.rows[0] as {
      updated_count: string;
      duration_ms: string;
    };

    return NextResponse.json({
      success: true,
      config: {
        ...newConfig,
        ratioBands: ratioBands || DEFAULT_RATIO_BANDS,
      },
      recalculation: {
        updatedCount: Number(recalcStats.updated_count),
        durationMs: Number(recalcStats.duration_ms),
      },
    });
  } catch (error) {
    console.error("Error updating scoring config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/scoring/config
 *
 * Preview score changes without saving - shows distribution with proposed bands.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ratioBands, contractType = "CHNM", term = 36, mileage = 10000 } = body;

    const bands: RatioBand[] = ratioBands || DEFAULT_RATIO_BANDS;

    // Build dynamic CASE statement for preview scoring
    let caseStatement = "CASE ";
    const sortedBands = [...bands].sort((a, b) => a.maxRatio - b.maxRatio);

    for (const band of sortedBands) {
      caseStatement += `WHEN cost_ratio < ${band.maxRatio} THEN ${band.score} `;
    }
    caseStatement += `ELSE 10 END`;

    // Calculate preview distribution with proposed bands
    const previewResult = await db.execute(sql.raw(`
      WITH rate_ratios AS (
        SELECT
          pr.cap_code,
          pr.manufacturer,
          pr.model,
          pr.total_rental,
          pr.p11d,
          CASE
            WHEN pr.contract_type ILIKE '%PCH%' THEN (pr.total_rental / 1.2 * pr.term) / NULLIF(pr.p11d, 0)
            ELSE (pr.total_rental::float * pr.term) / NULLIF(pr.p11d, 0)
          END as cost_ratio,
          ROW_NUMBER() OVER (PARTITION BY pr.cap_code ORDER BY pr.total_rental) as rn
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id
        WHERE ri.is_latest = true
          AND pr.contract_type = '${contractType}'
          AND pr.term = ${term}
          AND pr.annual_mileage = ${mileage}
          AND pr.p11d > 0
      ),
      scored AS (
        SELECT
          cap_code,
          manufacturer,
          model,
          total_rental,
          p11d,
          cost_ratio,
          ${caseStatement} as preview_score
        FROM rate_ratios
        WHERE rn = 1 AND cost_ratio IS NOT NULL
      )
      SELECT
        CASE
          WHEN preview_score >= 80 THEN 'hot'
          WHEN preview_score >= 65 THEN 'great'
          WHEN preview_score >= 50 THEN 'good'
          WHEN preview_score >= 40 THEN 'fair'
          ELSE 'average'
        END as tier,
        COUNT(*) as count
      FROM scored
      GROUP BY 1
    `));

    const distribution: Record<string, number> = {
      hot: 0,
      great: 0,
      good: 0,
      fair: 0,
      average: 0,
    };

    for (const row of previewResult.rows as { tier: string; count: string }[]) {
      distribution[row.tier] = Number(row.count);
    }

    return NextResponse.json({
      preview: true,
      distribution,
      totalVehicles: Object.values(distribution).reduce((a, b) => a + b, 0),
      proposedBands: bands,
      appliedFilters: {
        contractType,
        term,
        mileage,
      },
    });
  } catch (error) {
    console.error("Error calculating score preview:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate preview" },
      { status: 500 }
    );
  }
}
