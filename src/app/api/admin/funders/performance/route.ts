import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export interface FunderPerformanceMetrics {
  code: string;
  name: string;
  // Coverage metrics
  totalVehicles: number;
  uniqueCapCodes: number;
  // Competitiveness metrics
  bestPriceCount: number;
  bestPricePercent: number;
  avgPricePosition: number; // 1 = always cheapest, higher = less competitive
  // Score metrics
  avgScore: number;
  highScoreCount: number; // score >= 80
  excellentScoreCount: number; // score >= 90
  // Price metrics
  avgMonthlyPriceGbp: number;
  minMonthlyPriceGbp: number;
  maxMonthlyPriceGbp: number;
  // Freshness
  lastImport: string | null;
  daysSinceImport: number;
}

export interface FunderComparisonData {
  capCode: string;
  manufacturer: string;
  model: string;
  prices: Record<string, number | null>; // provider code -> price in GBP
  bestProvider: string;
  priceDiff: number; // difference between best and worst in GBP
}

export interface FunderPerformanceResponse {
  funders: FunderPerformanceMetrics[];
  comparisons: FunderComparisonData[];
  summary: {
    totalVehicles: number;
    totalProviders: number;
    avgCompetition: number; // avg providers per vehicle
    mostCompetitive: string;
    leastCompetitive: string;
  };
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
  ald: "ALD Automotive",
  arval: "Arval",
  alphabet: "Alphabet",
  zenith: "Zenith",
  leasys: "Leasys",
};

// Dynamically fetch providers from DB instead of hardcoding
async function getActiveProviders(): Promise<string[]> {
  const result = await db
    .selectDistinct({ providerCode: providerRates.providerCode })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(eq(ratebookImports.isLatest, true));

  return result.map(r => r.providerCode).filter(Boolean) as string[];
}

/**
 * GET /api/admin/funders/performance
 *
 * Returns performance metrics for each funder.
 *
 * Query params:
 * - contractType: filter by contract type (CH, PCH, etc.)
 * - limit: max comparisons to return (default 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const contractType = searchParams.get("contractType");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build conditions for latest rates
    const baseConditions = [eq(ratebookImports.isLatest, true)];

    // Get all active providers dynamically
    const activeProviders = await getActiveProviders();

    // Get metrics per provider
    const funderMetrics: FunderPerformanceMetrics[] = [];

    for (const providerCode of activeProviders) {
      const conditions = [...baseConditions, eq(providerRates.providerCode, providerCode)];
      if (contractType) {
        conditions.push(eq(providerRates.contractType, contractType));
      }

      // Get aggregate metrics
      const [metrics] = await db
        .select({
          totalVehicles: sql<number>`count(*)::int`,
          uniqueCapCodes: sql<number>`count(distinct ${providerRates.capCode})::int`,
          avgScore: sql<number>`avg(${providerRates.score})::int`,
          highScoreCount: sql<number>`count(*) filter (where ${providerRates.score} >= 80)::int`,
          excellentScoreCount: sql<number>`count(*) filter (where ${providerRates.score} >= 90)::int`,
          avgPrice: sql<number>`avg(${providerRates.totalRental})::int`,
          minPrice: sql<number>`min(${providerRates.totalRental})::int`,
          maxPrice: sql<number>`max(${providerRates.totalRental})::int`,
        })
        .from(providerRates)
        .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
        .where(and(...conditions));

      // Get last import date
      const [lastImportData] = await db
        .select({
          createdAt: ratebookImports.createdAt,
        })
        .from(ratebookImports)
        .where(
          and(
            eq(ratebookImports.providerCode, providerCode),
            eq(ratebookImports.isLatest, true)
          )
        )
        .orderBy(desc(ratebookImports.createdAt))
        .limit(1);

      const lastImport = lastImportData?.createdAt || null;
      const daysSinceImport = lastImport
        ? Math.floor((Date.now() - lastImport.getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      funderMetrics.push({
        code: providerCode,
        name: PROVIDER_NAMES[providerCode] || providerCode,
        totalVehicles: metrics?.totalVehicles || 0,
        uniqueCapCodes: metrics?.uniqueCapCodes || 0,
        bestPriceCount: 0, // Calculated below
        bestPricePercent: 0,
        avgPricePosition: 0,
        avgScore: metrics?.avgScore || 0,
        highScoreCount: metrics?.highScoreCount || 0,
        excellentScoreCount: metrics?.excellentScoreCount || 0,
        avgMonthlyPriceGbp: Math.round((metrics?.avgPrice || 0) / 100),
        minMonthlyPriceGbp: Math.round((metrics?.minPrice || 0) / 100),
        maxMonthlyPriceGbp: Math.round((metrics?.maxPrice || 0) / 100),
        lastImport: lastImport?.toISOString() || null,
        daysSinceImport,
      });
    }

    // Get best price analysis - find which provider has best price per CAP code
    const bestPriceConditions = [...baseConditions];
    if (contractType) {
      bestPriceConditions.push(eq(providerRates.contractType, contractType));
    }

    const pricesByCapCode = await db
      .select({
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        providerCode: providerRates.providerCode,
        minPrice: sql<number>`min(${providerRates.totalRental})::int`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(and(...bestPriceConditions))
      .groupBy(
        providerRates.capCode,
        providerRates.manufacturer,
        providerRates.model,
        providerRates.providerCode
      );

    // Group by CAP code to find best provider and build comparisons
    const capCodeMap = new Map<string, {
      manufacturer: string;
      model: string;
      prices: Record<string, number>;
    }>();

    for (const row of pricesByCapCode) {
      if (!row.capCode) continue;

      if (!capCodeMap.has(row.capCode)) {
        capCodeMap.set(row.capCode, {
          manufacturer: row.manufacturer,
          model: row.model,
          prices: {},
        });
      }

      const entry = capCodeMap.get(row.capCode)!;
      entry.prices[row.providerCode] = row.minPrice;
    }

    // Calculate best price counts and comparisons
    const bestPriceCounts: Record<string, number> = {};
    const pricePositions: Record<string, number[]> = {};
    const comparisons: FunderComparisonData[] = [];

    for (const [capCode, data] of capCodeMap) {
      const prices = Object.entries(data.prices);
      if (prices.length === 0) continue;

      // Sort by price to find positions
      prices.sort((a, b) => a[1] - b[1]);

      const bestProvider = prices[0][0];
      const bestPrice = prices[0][1];
      const worstPrice = prices[prices.length - 1][1];

      // Count best prices
      bestPriceCounts[bestProvider] = (bestPriceCounts[bestProvider] || 0) + 1;

      // Track positions
      prices.forEach(([provider], index) => {
        if (!pricePositions[provider]) pricePositions[provider] = [];
        pricePositions[provider].push(index + 1);
      });

      // Build comparison data (only for vehicles with multiple providers)
      if (prices.length > 1) {
        const priceRecord: Record<string, number | null> = {};
        for (const provider of activeProviders) {
          priceRecord[provider] = data.prices[provider]
            ? Math.round(data.prices[provider] / 100)
            : null;
        }

        comparisons.push({
          capCode,
          manufacturer: data.manufacturer,
          model: data.model,
          prices: priceRecord,
          bestProvider,
          priceDiff: Math.round((worstPrice - bestPrice) / 100),
        });
      }
    }

    // Update funder metrics with best price data
    const totalComparableVehicles = capCodeMap.size;
    for (const funder of funderMetrics) {
      funder.bestPriceCount = bestPriceCounts[funder.code] || 0;
      funder.bestPricePercent = totalComparableVehicles > 0
        ? Math.round((funder.bestPriceCount / totalComparableVehicles) * 100)
        : 0;

      const positions = pricePositions[funder.code] || [];
      funder.avgPricePosition = positions.length > 0
        ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
        : 0;
    }

    // Sort comparisons by price diff (biggest savings first)
    comparisons.sort((a, b) => b.priceDiff - a.priceDiff);

    // Calculate summary
    const activeFunders = funderMetrics.filter((f) => f.totalVehicles > 0);
    const mostCompetitive = [...funderMetrics].sort((a, b) => b.bestPricePercent - a.bestPricePercent)[0];
    const leastCompetitive = [...funderMetrics]
      .filter((f) => f.totalVehicles > 0)
      .sort((a, b) => a.bestPricePercent - b.bestPricePercent)[0];

    // Calculate average providers per vehicle
    const providersPerVehicle = Array.from(capCodeMap.values())
      .map((v) => Object.keys(v.prices).length);
    const avgCompetition = providersPerVehicle.length > 0
      ? Math.round((providersPerVehicle.reduce((a, b) => a + b, 0) / providersPerVehicle.length) * 10) / 10
      : 0;

    const response: FunderPerformanceResponse = {
      funders: funderMetrics,
      comparisons: comparisons.slice(0, limit),
      summary: {
        totalVehicles: totalComparableVehicles,
        totalProviders: activeFunders.length,
        avgCompetition,
        mostCompetitive: mostCompetitive?.name || "N/A",
        leastCompetitive: leastCompetitive?.name || "N/A",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching funder performance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch performance" },
      { status: 500 }
    );
  }
}
