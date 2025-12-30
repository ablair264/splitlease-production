import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  providerRates,
  ratebookImports,
  vehicles,
  featuredDeals,
  marketIntelligenceDeals,
  marketIntelligenceSnapshots,
} from "@/lib/db/schema";
import { eq, and, desc, sql, gt, isNotNull, notInArray, inArray } from "drizzle-orm";

export type SuggestionReason =
  | "exceptional_value"
  | "market_beater"
  | "price_drop"
  | "new_model"
  | "popular_segment"
  | "low_competition"
  | "high_margin_potential";

export interface SmartSuggestion {
  capCode: string;
  vehicleId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  bodyType: string | null;
  // Pricing
  monthlyPriceGbp: number;
  p11dGbp: number;
  bestProviderCode: string;
  contractType: string;
  term: number;
  mileage: number;
  // Scores
  valueScore: number;
  confidenceScore: number; // How confident we are in this suggestion
  // Market comparison
  marketAvgGbp: number | null;
  marketPosition: string | null; // "cheapest", "below_avg", "above_avg"
  priceDeltaPercent: number | null;
  // Reasoning
  reasons: SuggestionReason[];
  headline: string;
  explanation: string;
}

export interface SmartSuggestionsResponse {
  suggestions: SmartSuggestion[];
  categories: {
    exceptionalValue: SmartSuggestion[];
    marketBeaters: SmartSuggestion[];
    trending: SmartSuggestion[];
  };
  metadata: {
    generatedAt: string;
    totalAnalyzed: number;
    marketDataFreshness: string | null;
  };
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/offers/suggestions
 *
 * Returns AI-powered suggestions for deals to feature.
 *
 * Query params:
 * - limit: max suggestions per category (default 5)
 * - minScore: minimum value score (default 75)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const minScore = parseInt(searchParams.get("minScore") || "75");

    // Get already featured CAP codes to exclude
    const featuredCapCodes = await db
      .select({ capCode: featuredDeals.capCode })
      .from(featuredDeals)
      .where(eq(featuredDeals.isActive, true));

    const excludeCapCodes = featuredCapCodes.map((f) => f.capCode);

    // Get high-score deals
    const highScoreDeals = await db
      .select({
        capCode: providerRates.capCode,
        vehicleId: providerRates.vehicleId,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        minPrice: sql<number>`min(${providerRates.totalRental})::int`,
        bestProvider: sql<string>`(array_agg(${providerRates.providerCode} ORDER BY ${providerRates.totalRental}))[1]`,
        bestTerm: sql<number>`(array_agg(${providerRates.term} ORDER BY ${providerRates.totalRental}))[1]`,
        bestMileage: sql<number>`(array_agg(${providerRates.annualMileage} ORDER BY ${providerRates.totalRental}))[1]`,
        bestContract: sql<string>`(array_agg(${providerRates.contractType} ORDER BY ${providerRates.totalRental}))[1]`,
        maxScore: sql<number>`max(${providerRates.score})::int`,
        providerCount: sql<number>`count(distinct ${providerRates.providerCode})::int`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(ratebookImports.isLatest, true),
          gt(providerRates.score, minScore),
          isNotNull(providerRates.capCode),
          excludeCapCodes.length > 0
            ? notInArray(providerRates.capCode, excludeCapCodes)
            : undefined
        )
      )
      .groupBy(
        providerRates.capCode,
        providerRates.vehicleId,
        providerRates.manufacturer,
        providerRates.model,
        providerRates.variant
      )
      .orderBy(desc(sql`max(${providerRates.score})`))
      .limit(50);

    // Get vehicle details (P11D, fuel type, body type)
    const vehicleIds = highScoreDeals
      .map((d) => d.vehicleId)
      .filter((id): id is string => id !== null);

    let vehicleMap = new Map<string, { p11d: number; fuelType: string | null; bodyType: string | null }>();
    if (vehicleIds.length > 0) {
      const vehicleData = await db
        .select({
          id: vehicles.id,
          p11d: vehicles.p11d,
          fuelType: vehicles.fuelType,
          bodyType: vehicles.bodyStyle,
        })
        .from(vehicles)
        .where(inArray(vehicles.id, vehicleIds));

      vehicleMap = new Map(
        vehicleData.map((v) => [v.id, { p11d: v.p11d || 0, fuelType: v.fuelType, bodyType: v.bodyType }])
      );
    }

    // Get market intelligence data
    const capCodes = highScoreDeals.map((d) => d.capCode).filter((c): c is string => c !== null);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let marketMap = new Map<string, { avgPrice: number; minPrice: number }>();
    let marketDataDate: string | null = null;

    if (capCodes.length > 0) {
      const marketData = await db
        .select({
          capCode: marketIntelligenceDeals.matchedCapCode,
          avgPrice: sql<number>`avg(${marketIntelligenceDeals.monthlyPrice})::int`,
          minPrice: sql<number>`min(${marketIntelligenceDeals.monthlyPrice})::int`,
        })
        .from(marketIntelligenceDeals)
        .innerJoin(
          marketIntelligenceSnapshots,
          eq(marketIntelligenceDeals.snapshotId, marketIntelligenceSnapshots.id)
        )
        .where(
          and(
            inArray(marketIntelligenceDeals.matchedCapCode, capCodes),
            gt(marketIntelligenceSnapshots.snapshotDate, sevenDaysAgo)
          )
        )
        .groupBy(marketIntelligenceDeals.matchedCapCode);

      marketMap = new Map(
        marketData.map((m) => [m.capCode!, { avgPrice: m.avgPrice, minPrice: m.minPrice }])
      );

      // Get latest market data date
      const [latestSnapshot] = await db
        .select({ date: marketIntelligenceSnapshots.snapshotDate })
        .from(marketIntelligenceSnapshots)
        .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
        .limit(1);

      marketDataDate = latestSnapshot?.date?.toISOString() || null;
    }

    // Build suggestions with reasoning
    const suggestions: SmartSuggestion[] = [];

    for (const deal of highScoreDeals) {
      if (!deal.capCode) continue;

      const vehicleInfo = deal.vehicleId ? vehicleMap.get(deal.vehicleId) : null;
      const marketInfo = marketMap.get(deal.capCode);

      const monthlyPriceGbp = Math.round(deal.minPrice / 100);
      const p11dGbp = Math.round((vehicleInfo?.p11d || 0) / 100);
      const marketAvgGbp = marketInfo ? Math.round(marketInfo.avgPrice / 100) : null;

      // Calculate market position
      let marketPosition: string | null = null;
      let priceDeltaPercent: number | null = null;

      if (marketAvgGbp && marketAvgGbp > 0) {
        priceDeltaPercent = Math.round(((monthlyPriceGbp - marketAvgGbp) / marketAvgGbp) * 100);
        if (priceDeltaPercent <= -15) marketPosition = "cheapest";
        else if (priceDeltaPercent <= 0) marketPosition = "below_avg";
        else marketPosition = "above_avg";
      }

      // Determine reasons and confidence
      const reasons: SuggestionReason[] = [];
      let confidenceScore = 50;

      // Exceptional value (score >= 90)
      if (deal.maxScore >= 90) {
        reasons.push("exceptional_value");
        confidenceScore += 25;
      }

      // Market beater
      if (priceDeltaPercent !== null && priceDeltaPercent <= -10) {
        reasons.push("market_beater");
        confidenceScore += 20;
      }

      // Low competition (only 1-2 providers)
      if (deal.providerCount <= 2) {
        reasons.push("low_competition");
        confidenceScore += 10;
      }

      // Popular segments (Electric, SUV)
      if (vehicleInfo?.fuelType === "Electric") {
        reasons.push("popular_segment");
        confidenceScore += 10;
      }

      // High margin potential (cheap but high P11D)
      if (p11dGbp > 40000 && monthlyPriceGbp < 400) {
        reasons.push("high_margin_potential");
        confidenceScore += 15;
      }

      // Cap confidence at 100
      confidenceScore = Math.min(confidenceScore, 100);

      // Generate headline and explanation
      let headline = "";
      let explanation = "";

      if (reasons.includes("exceptional_value")) {
        headline = `Exceptional Value: ${deal.manufacturer} ${deal.model}`;
        explanation = `Score of ${deal.maxScore} puts this in the top tier of deals. `;
      } else if (reasons.includes("market_beater")) {
        headline = `Market Beater: ${deal.manufacturer} ${deal.model}`;
        explanation = `${Math.abs(priceDeltaPercent!)}% below market average. `;
      } else {
        headline = `Strong Deal: ${deal.manufacturer} ${deal.model}`;
        explanation = `Score of ${deal.maxScore} indicates good value. `;
      }

      if (marketAvgGbp) {
        explanation += `Market avg £${marketAvgGbp}/mo vs our £${monthlyPriceGbp}/mo. `;
      }

      if (reasons.includes("popular_segment")) {
        explanation += `Electric vehicles are in high demand. `;
      }

      if (reasons.includes("low_competition")) {
        explanation += `Limited funder coverage may indicate exclusive opportunity. `;
      }

      suggestions.push({
        capCode: deal.capCode,
        vehicleId: deal.vehicleId,
        manufacturer: deal.manufacturer,
        model: deal.model,
        variant: deal.variant,
        fuelType: vehicleInfo?.fuelType || null,
        bodyType: vehicleInfo?.bodyType || null,
        monthlyPriceGbp,
        p11dGbp,
        bestProviderCode: deal.bestProvider,
        contractType: deal.bestContract,
        term: deal.bestTerm,
        mileage: deal.bestMileage,
        valueScore: deal.maxScore,
        confidenceScore,
        marketAvgGbp,
        marketPosition,
        priceDeltaPercent,
        reasons,
        headline,
        explanation: explanation.trim(),
      });
    }

    // Sort by confidence score
    suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Categorize suggestions
    const exceptionalValue = suggestions
      .filter((s) => s.reasons.includes("exceptional_value"))
      .slice(0, limit);

    const marketBeaters = suggestions
      .filter((s) => s.reasons.includes("market_beater") && !s.reasons.includes("exceptional_value"))
      .slice(0, limit);

    const trending = suggestions
      .filter((s) => s.reasons.includes("popular_segment"))
      .slice(0, limit);

    const response: SmartSuggestionsResponse = {
      suggestions: suggestions.slice(0, limit * 3),
      categories: {
        exceptionalValue,
        marketBeaters,
        trending,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalAnalyzed: highScoreDeals.length,
        marketDataFreshness: marketDataDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
