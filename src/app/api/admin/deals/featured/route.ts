import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredDeals, vehicles } from "@/lib/db/schema";
import { sql, eq, and, desc, isNull } from "drizzle-orm";

const PROVIDER_LABELS: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus Fleet",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/deals/featured
 *
 * Returns featured deals and candidates for the Deal Finder page.
 *
 * Query params:
 * - tab: featured | candidates (default: featured)
 * - contractType: CH, CHNM, PCH, PCHNM, BSSNL (default: CHNM)
 * - term: 24, 36, 48, 60 (default: 36)
 * - mileage: 5000, 8000, 10000, 15000 (default: 10000)
 * - scoreMin: Minimum score for candidates (default: 80)
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "featured";
    const contractType = searchParams.get("contractType") || "CHNM";
    const term = parseInt(searchParams.get("term") || "36");
    const mileage = parseInt(searchParams.get("mileage") || "10000");
    const scoreMin = parseInt(searchParams.get("scoreMin") || "80");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    // Value score SQL
    const valueScoreSQL = `
      CASE
        WHEN pr.p11d IS NULL OR pr.p11d <= 0 THEN 50
        ELSE
          CASE
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.20 THEN 95
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.28 THEN
              95 - (((pr.total_rental::float * 36) / pr.p11d - 0.20) / 0.08 * 15)::int
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.38 THEN
              80 - (((pr.total_rental::float * 36) / pr.p11d - 0.28) / 0.10 * 15)::int
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.48 THEN
              65 - (((pr.total_rental::float * 36) / pr.p11d - 0.38) / 0.10 * 15)::int
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.58 THEN
              50 - (((pr.total_rental::float * 36) / pr.p11d - 0.48) / 0.10 * 10)::int
            WHEN (pr.total_rental::float * 36) / pr.p11d < 0.70 THEN
              40 - (((pr.total_rental::float * 36) / pr.p11d - 0.58) / 0.12 * 15)::int
            ELSE
              GREATEST(10, 25 - (((pr.total_rental::float * 36) / pr.p11d - 0.70) / 0.30 * 15)::int)
          END
      END
    `;

    if (tab === "featured") {
      // Get currently featured deals
      const featured = await db
        .select()
        .from(featuredDeals)
        .where(
          and(
            eq(featuredDeals.isActive, true),
            eq(featuredDeals.contractType, contractType)
          )
        )
        .orderBy(desc(featuredDeals.featuredAt))
        .limit(pageSize)
        .offset(offset);

      // Count total
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(featuredDeals)
        .where(
          and(
            eq(featuredDeals.isActive, true),
            eq(featuredDeals.contractType, contractType)
          )
        );

      const total = Number(countResult[0]?.count || 0);

      // Get current prices for featured deals
      const capCodes = featured.map((f) => f.capCode);
      let currentPrices: Record<string, { price: number; score: number; provider: string }> = {};

      if (capCodes.length > 0) {
        const pricesResult = await db.execute(sql.raw(`
          SELECT DISTINCT ON (pr.cap_code)
            pr.cap_code,
            pr.total_rental,
            pr.provider_code,
            (${valueScoreSQL}) AS score
          FROM provider_rates pr
          JOIN ratebook_imports ri ON ri.id = pr.import_id
          WHERE ri.is_latest = true
            AND pr.contract_type = '${contractType}'
            AND pr.term = ${term}
            AND pr.annual_mileage = ${mileage}
            AND pr.cap_code IN (${capCodes.map((c) => `'${c}'`).join(", ")})
          ORDER BY pr.cap_code, pr.total_rental ASC
        `));

        (pricesResult.rows as Array<{
          cap_code: string;
          total_rental: string;
          provider_code: string;
          score: string;
        }>).forEach((row) => {
          currentPrices[row.cap_code] = {
            price: Math.round(Number(row.total_rental) / 100),
            score: Number(row.score),
            provider: row.provider_code,
          };
        });
      }

      return NextResponse.json({
        tab: "featured",
        deals: featured.map((f) => {
          const current = currentPrices[f.capCode];
          const daysFeatured = Math.floor(
            (Date.now() - new Date(f.featuredAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            id: f.id,
            capCode: f.capCode,
            manufacturer: f.manufacturer,
            model: f.model,
            variant: f.variant,
            displayName: f.variant
              ? `${f.model} ${f.variant}`
              : f.model,
            fuelType: f.fuelType,
            // Price at featuring
            featuredPriceGbp: f.bestMonthlyPrice ? Math.round(f.bestMonthlyPrice / 100) : null,
            featuredScore: f.scoreAtFeaturing,
            featuredProvider: f.bestProviderCode,
            // Current price (may have changed)
            currentPriceGbp: current?.price || null,
            currentScore: current?.score || null,
            currentProvider: current?.provider || null,
            // Meta
            daysFeatured,
            featuredAt: f.featuredAt,
          };
        }),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total,
        },
      });
    } else {
      // Get candidates - high-scoring deals not yet featured
      const candidatesResult = await db.execute(sql.raw(`
        WITH best_deals AS (
          SELECT DISTINCT ON (pr.cap_code)
            pr.cap_code,
            pr.manufacturer,
            pr.model,
            pr.variant,
            pr.fuel_type,
            pr.total_rental,
            pr.p11d,
            pr.provider_code,
            (${valueScoreSQL}) AS score,
            v.image_folder
          FROM provider_rates pr
          JOIN ratebook_imports ri ON ri.id = pr.import_id
          LEFT JOIN vehicles v ON v.cap_code = pr.cap_code
          WHERE ri.is_latest = true
            AND pr.contract_type = '${contractType}'
            AND pr.term = ${term}
            AND pr.annual_mileage = ${mileage}
            AND pr.p11d IS NOT NULL
            AND pr.p11d > 0
          ORDER BY pr.cap_code, pr.total_rental ASC
        )
        SELECT bd.*
        FROM best_deals bd
        LEFT JOIN featured_deals fd ON fd.cap_code = bd.cap_code
          AND fd.is_active = true
          AND fd.contract_type = '${contractType}'
        WHERE fd.id IS NULL
          AND bd.score >= ${scoreMin}
        ORDER BY bd.score DESC, bd.total_rental ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `));

      // Count total candidates
      const countResult = await db.execute(sql.raw(`
        WITH best_deals AS (
          SELECT DISTINCT ON (pr.cap_code)
            pr.cap_code,
            (${valueScoreSQL}) AS score
          FROM provider_rates pr
          JOIN ratebook_imports ri ON ri.id = pr.import_id
          WHERE ri.is_latest = true
            AND pr.contract_type = '${contractType}'
            AND pr.term = ${term}
            AND pr.annual_mileage = ${mileage}
            AND pr.p11d IS NOT NULL
            AND pr.p11d > 0
          ORDER BY pr.cap_code, pr.total_rental ASC
        )
        SELECT COUNT(*) AS total
        FROM best_deals bd
        LEFT JOIN featured_deals fd ON fd.cap_code = bd.cap_code
          AND fd.is_active = true
          AND fd.contract_type = '${contractType}'
        WHERE fd.id IS NULL
          AND bd.score >= ${scoreMin}
      `));

      const total = Number((countResult.rows[0] as { total: string })?.total || 0);

      const candidates = (candidatesResult.rows as Array<{
        cap_code: string;
        manufacturer: string;
        model: string;
        variant: string | null;
        fuel_type: string | null;
        total_rental: string;
        p11d: string;
        provider_code: string;
        score: string;
        image_folder: string | null;
      }>).map((row) => {
        const score = Number(row.score);
        let scoreLabel = "Hot";
        if (score < 80) scoreLabel = "Great";
        if (score < 65) scoreLabel = "Good";

        return {
          capCode: row.cap_code,
          manufacturer: row.manufacturer,
          model: row.model,
          variant: row.variant,
          displayName: row.variant
            ? `${row.model} ${row.variant}`
            : row.model,
          fuelType: row.fuel_type,
          monthlyPriceGbp: Math.round(Number(row.total_rental) / 100),
          p11dGbp: Math.round(Number(row.p11d) / 100),
          providerCode: row.provider_code,
          providerName: PROVIDER_LABELS[row.provider_code] || row.provider_code.toUpperCase(),
          score,
          scoreLabel,
          imageUrl: row.image_folder
            ? `/images/vehicles/${row.image_folder}/front_view.webp`
            : null,
        };
      });

      return NextResponse.json({
        tab: "candidates",
        deals: candidates,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasMore: page * pageSize < total,
        },
        appliedFilters: {
          contractType,
          term,
          mileage,
          scoreMin,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching featured deals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/deals/featured
 *
 * Feature a vehicle (add to featured deals).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      capCode,
      manufacturer,
      model,
      variant,
      fuelType,
      providerCode,
      monthlyPrice, // in GBP
      term,
      mileage,
      contractType,
      score,
    } = body;

    if (!capCode || !manufacturer || !model) {
      return NextResponse.json(
        { error: "Missing required fields: capCode, manufacturer, model" },
        { status: 400 }
      );
    }

    // Check if already featured
    const existing = await db
      .select()
      .from(featuredDeals)
      .where(
        and(
          eq(featuredDeals.capCode, capCode),
          eq(featuredDeals.isActive, true),
          eq(featuredDeals.contractType, contractType || "CHNM")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This vehicle is already featured" },
        { status: 409 }
      );
    }

    // Get vehicle ID if exists
    const vehicleResult = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.capCode, capCode))
      .limit(1);

    const vehicleId = vehicleResult[0]?.id || null;

    // Insert featured deal
    const [newFeatured] = await db
      .insert(featuredDeals)
      .values({
        capCode,
        vehicleId,
        manufacturer,
        model,
        variant: variant || null,
        fuelType: fuelType || null,
        bestProviderCode: providerCode || null,
        bestMonthlyPrice: monthlyPrice ? Math.round(monthlyPrice * 100) : null,
        bestTerm: term || null,
        bestMileage: mileage || null,
        contractType: contractType || "CHNM",
        scoreAtFeaturing: score || null,
        featuredBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      featuredDeal: newFeatured,
    });
  } catch (error) {
    console.error("Error featuring deal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to feature deal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/deals/featured
 *
 * Unfeature a vehicle (set isActive = false).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const capCode = searchParams.get("capCode");
    const contractType = searchParams.get("contractType") || "CHNM";

    if (!id && !capCode) {
      return NextResponse.json(
        { error: "Must provide either id or capCode" },
        { status: 400 }
      );
    }

    let updated;
    if (id) {
      updated = await db
        .update(featuredDeals)
        .set({
          isActive: false,
          unfeaturedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, id))
        .returning();
    } else {
      updated = await db
        .update(featuredDeals)
        .set({
          isActive: false,
          unfeaturedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(featuredDeals.capCode, capCode!),
            eq(featuredDeals.isActive, true),
            eq(featuredDeals.contractType, contractType)
          )
        )
        .returning();
    }

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Featured deal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      unfeatured: updated[0],
    });
  } catch (error) {
    console.error("Error unfeaturing deal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unfeature deal" },
      { status: 500 }
    );
  }
}
