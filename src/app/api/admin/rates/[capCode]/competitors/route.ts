import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketIntelligenceDeals, marketIntelligenceSnapshots, providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, isNotNull, desc, gt, sql, inArray } from "drizzle-orm";

const SOURCE_LABELS: Record<string, string> = {
  leasing_com: "Leasing.com",
  leaseloco: "LeaseLoco",
  appliedleasing: "Applied Leasing",
  selectcarleasing: "Select Car Leasing",
  vipgateway: "VIP Gateway",
};

export interface CompetitorPrice {
  source: string;
  sourceName: string;
  monthlyPriceGbp: number;
  term: number | null;
  mileage: number | null;
  leaseType: string | null;
  valueScore: number | null;
  stockStatus: string | null;
  snapshotDate: string;
}

export interface OurPrice {
  providerCode: string;
  providerName: string;
  monthlyPriceGbp: number;
  term: number;
  mileage: number;
  contractType: string;
}

export interface CompetitorComparison {
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  ourPrices: OurPrice[];
  competitorPrices: CompetitorPrice[];
  summary: {
    ourBestPrice: number;
    marketMin: number;
    marketMax: number;
    marketAvg: number;
    ourPosition: string;
    priceDeltaPercent: number;
  };
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/rates/[capCode]/competitors
 *
 * Returns competitor pricing data for a specific vehicle.
 *
 * Query params:
 * - term: filter by term (optional)
 * - mileage: filter by mileage (optional)
 * - leaseType: personal | business (optional)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ capCode: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { capCode } = await params;
    const { searchParams } = new URL(req.url);
    const termFilter = searchParams.get("term");
    const mileageFilter = searchParams.get("mileage");
    const leaseTypeFilter = searchParams.get("leaseType");

    // Get our rates for this vehicle
    const ourRatesResult = await db
      .select({
        providerCode: providerRates.providerCode,
        totalRental: providerRates.totalRental,
        term: providerRates.term,
        mileage: providerRates.annualMileage,
        contractType: providerRates.contractType,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(providerRates.capCode, capCode),
          eq(ratebookImports.isLatest, true)
        )
      )
      .orderBy(providerRates.totalRental);

    if (ourRatesResult.length === 0) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    const vehicleInfo = ourRatesResult[0];

    // Get competitor prices from recent snapshots (last 14 days for more data)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const competitorConditions = [
      eq(marketIntelligenceDeals.matchedCapCode, capCode),
      isNotNull(marketIntelligenceDeals.matchedCapCode),
      gt(marketIntelligenceSnapshots.snapshotDate, fourteenDaysAgo),
    ];

    const competitorResult = await db
      .select({
        source: marketIntelligenceDeals.source,
        monthlyPrice: marketIntelligenceDeals.monthlyPrice,
        term: marketIntelligenceDeals.term,
        mileage: marketIntelligenceDeals.annualMileage,
        leaseType: marketIntelligenceDeals.leaseType,
        valueScore: marketIntelligenceDeals.valueScore,
        stockStatus: marketIntelligenceDeals.stockStatus,
        snapshotDate: marketIntelligenceSnapshots.snapshotDate,
      })
      .from(marketIntelligenceDeals)
      .innerJoin(
        marketIntelligenceSnapshots,
        eq(marketIntelligenceDeals.snapshotId, marketIntelligenceSnapshots.id)
      )
      .where(and(...competitorConditions))
      .orderBy(desc(marketIntelligenceSnapshots.snapshotDate));

    // Format our prices
    const ourPrices: OurPrice[] = ourRatesResult.map((r) => ({
      providerCode: r.providerCode,
      providerName: PROVIDER_NAMES[r.providerCode] || r.providerCode.toUpperCase(),
      monthlyPriceGbp: Math.round(r.totalRental / 100),
      term: r.term,
      mileage: r.mileage,
      contractType: r.contractType,
    }));

    // Dedupe competitor prices (keep most recent per source)
    const seenSources = new Set<string>();
    const competitorPrices: CompetitorPrice[] = competitorResult
      .filter((c) => {
        // Apply filters if provided
        if (termFilter && c.term && c.term !== parseInt(termFilter)) return false;
        if (mileageFilter && c.mileage && c.mileage !== parseInt(mileageFilter)) return false;
        if (leaseTypeFilter && c.leaseType && c.leaseType !== leaseTypeFilter) return false;

        // Dedupe by source
        if (seenSources.has(c.source)) return false;
        seenSources.add(c.source);
        return true;
      })
      .map((c) => ({
        source: c.source,
        sourceName: SOURCE_LABELS[c.source] || c.source,
        monthlyPriceGbp: Math.round(c.monthlyPrice / 100),
        term: c.term,
        mileage: c.mileage,
        leaseType: c.leaseType,
        valueScore: c.valueScore,
        stockStatus: c.stockStatus,
        snapshotDate: c.snapshotDate.toISOString(),
      }));

    // Calculate summary
    const ourBestPrice = Math.min(...ourPrices.map((p) => p.monthlyPriceGbp));
    const allPrices = [
      ...competitorPrices.map((p) => p.monthlyPriceGbp),
    ];

    let marketMin = ourBestPrice;
    let marketMax = ourBestPrice;
    let marketAvg = ourBestPrice;

    if (allPrices.length > 0) {
      marketMin = Math.min(...allPrices);
      marketMax = Math.max(...allPrices);
      marketAvg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
    }

    // Determine our position
    let ourPosition = "only";
    if (allPrices.length > 0) {
      if (ourBestPrice <= marketMin) {
        ourPosition = "lowest";
      } else if (ourBestPrice < marketAvg) {
        ourPosition = "below-avg";
      } else if (ourBestPrice <= marketAvg * 1.1) {
        ourPosition = "average";
      } else if (ourBestPrice <= marketMax) {
        ourPosition = "above-avg";
      } else {
        ourPosition = "highest";
      }
    }

    const priceDeltaPercent = marketAvg > 0
      ? Math.round(((ourBestPrice - marketAvg) / marketAvg) * 100)
      : 0;

    const response: CompetitorComparison = {
      capCode,
      manufacturer: vehicleInfo.manufacturer,
      model: vehicleInfo.model,
      variant: vehicleInfo.variant,
      ourPrices,
      competitorPrices,
      summary: {
        ourBestPrice,
        marketMin,
        marketMax,
        marketAvg,
        ourPosition,
        priceDeltaPercent,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching competitor prices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch competitor prices" },
      { status: 500 }
    );
  }
}
