import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates, ratebookImports, marketIntelligenceDeals, marketIntelligenceSnapshots, vehicles } from "@/lib/db/schema";
import { eq, and, isNotNull, desc, gt, sql, inArray } from "drizzle-orm";

export type AlertSeverity = "critical" | "warning" | "info" | "opportunity";
export type AlertType = "too_expensive" | "too_cheap" | "no_coverage" | "beating_market";

export interface PriceDeltaAlert {
  id: string;
  capCode: string;
  vehicleId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  ourPriceGbp: number;
  marketAvgGbp: number;
  marketMinGbp: number;
  marketMaxGbp: number;
  priceDeltaGbp: number;
  priceDeltaPercent: number;
  competitorCount: number;
  bestFunder: string;
  message: string;
  actionSuggestion: string;
}

export interface PriceDeltaAlertsResponse {
  alerts: PriceDeltaAlert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    opportunity: number;
    potentialSavingsGbp: number;
    potentialRevenueGbp: number;
  };
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/alerts/price-delta
 *
 * Returns alerts for vehicles with significant price differences vs market.
 *
 * Query params:
 * - severity: filter by severity (critical, warning, info, opportunity)
 * - type: filter by alert type
 * - limit: max alerts to return (default 50)
 * - threshold: minimum delta % to alert on (default 10)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const severityFilter = searchParams.get("severity") as AlertSeverity | null;
    const typeFilter = searchParams.get("type") as AlertType | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const threshold = parseInt(searchParams.get("threshold") || "10");

    // Get recent market intelligence data (last 7 days for freshness)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get market prices grouped by CAP code
    const marketPrices = await db
      .select({
        capCode: marketIntelligenceDeals.matchedCapCode,
        avgPrice: sql<number>`avg(${marketIntelligenceDeals.monthlyPrice})::int`,
        minPrice: sql<number>`min(${marketIntelligenceDeals.monthlyPrice})::int`,
        maxPrice: sql<number>`max(${marketIntelligenceDeals.monthlyPrice})::int`,
        competitorCount: sql<number>`count(distinct ${marketIntelligenceDeals.source})::int`,
      })
      .from(marketIntelligenceDeals)
      .innerJoin(
        marketIntelligenceSnapshots,
        eq(marketIntelligenceDeals.snapshotId, marketIntelligenceSnapshots.id)
      )
      .where(
        and(
          isNotNull(marketIntelligenceDeals.matchedCapCode),
          gt(marketIntelligenceSnapshots.snapshotDate, sevenDaysAgo)
        )
      )
      .groupBy(marketIntelligenceDeals.matchedCapCode);

    if (marketPrices.length === 0) {
      return NextResponse.json({
        alerts: [],
        summary: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
          opportunity: 0,
          potentialSavingsGbp: 0,
          potentialRevenueGbp: 0,
        },
      });
    }

    // Get our best prices for these CAP codes
    const capCodes = marketPrices.map((m) => m.capCode).filter(Boolean) as string[];

    const ourPrices = await db
      .select({
        capCode: providerRates.capCode,
        vehicleId: providerRates.vehicleId,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        minPrice: sql<number>`min(${providerRates.totalRental})::int`,
        bestProvider: sql<string>`(array_agg(${providerRates.providerCode} ORDER BY ${providerRates.totalRental}))[1]`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          inArray(providerRates.capCode, capCodes),
          eq(ratebookImports.isLatest, true)
        )
      )
      .groupBy(
        providerRates.capCode,
        providerRates.vehicleId,
        providerRates.manufacturer,
        providerRates.model,
        providerRates.variant
      );

    // Create lookup maps
    const marketMap = new Map(marketPrices.map((m) => [m.capCode, m]));

    // Generate alerts
    const alerts: PriceDeltaAlert[] = [];

    for (const our of ourPrices) {
      // Skip entries without CAP code
      if (!our.capCode) continue;

      const market = marketMap.get(our.capCode);
      if (!market || market.competitorCount === 0) continue;

      const ourPriceGbp = Math.round(our.minPrice / 100);
      const marketAvgGbp = Math.round(market.avgPrice / 100);
      const marketMinGbp = Math.round(market.minPrice / 100);
      const marketMaxGbp = Math.round(market.maxPrice / 100);
      const deltaGbp = ourPriceGbp - marketAvgGbp;
      const deltaPercent = marketAvgGbp > 0 ? Math.round((deltaGbp / marketAvgGbp) * 100) : 0;

      // Skip if delta is below threshold
      if (Math.abs(deltaPercent) < threshold) continue;

      let alertType: AlertType;
      let severity: AlertSeverity;
      let message: string;
      let actionSuggestion: string;

      if (deltaPercent >= 30) {
        // We're 30%+ more expensive than market
        alertType = "too_expensive";
        severity = "critical";
        message = `£${ourPriceGbp}/mo is ${deltaPercent}% above market avg (£${marketAvgGbp})`;
        actionSuggestion = "Review pricing urgently - significantly uncompetitive";
      } else if (deltaPercent >= 15) {
        // We're 15-30% more expensive
        alertType = "too_expensive";
        severity = "warning";
        message = `£${ourPriceGbp}/mo is ${deltaPercent}% above market avg (£${marketAvgGbp})`;
        actionSuggestion = "Consider price reduction to improve competitiveness";
      } else if (deltaPercent >= threshold) {
        // We're 10-15% more expensive
        alertType = "too_expensive";
        severity = "info";
        message = `£${ourPriceGbp}/mo is ${deltaPercent}% above market avg (£${marketAvgGbp})`;
        actionSuggestion = "Monitor pricing - slightly above market";
      } else if (deltaPercent <= -30) {
        // We're 30%+ cheaper - could be data issue or margin opportunity
        alertType = "too_cheap";
        severity = "warning";
        message = `£${ourPriceGbp}/mo is ${Math.abs(deltaPercent)}% below market avg (£${marketAvgGbp})`;
        actionSuggestion = "Verify pricing accuracy - may be leaving margin on table";
      } else if (deltaPercent <= -15) {
        // We're 15-30% cheaper - good opportunity
        alertType = "beating_market";
        severity = "opportunity";
        message = `£${ourPriceGbp}/mo is ${Math.abs(deltaPercent)}% below market avg (£${marketAvgGbp})`;
        actionSuggestion = "Strong competitive position - consider featuring this deal";
      } else if (deltaPercent <= -threshold) {
        // We're 10-15% cheaper
        alertType = "beating_market";
        severity = "opportunity";
        message = `£${ourPriceGbp}/mo is ${Math.abs(deltaPercent)}% below market avg (£${marketAvgGbp})`;
        actionSuggestion = "Good value - potential special offer candidate";
      } else {
        continue; // Skip if within threshold
      }

      // Apply filters
      if (severityFilter && severity !== severityFilter) continue;
      if (typeFilter && alertType !== typeFilter) continue;

      alerts.push({
        id: `${our.capCode}-${alertType}`,
        capCode: our.capCode,
        vehicleId: our.vehicleId,
        manufacturer: our.manufacturer,
        model: our.model,
        variant: our.variant,
        alertType,
        severity,
        ourPriceGbp,
        marketAvgGbp,
        marketMinGbp,
        marketMaxGbp,
        priceDeltaGbp: deltaGbp,
        priceDeltaPercent: deltaPercent,
        competitorCount: market.competitorCount,
        bestFunder: PROVIDER_NAMES[our.bestProvider] || our.bestProvider?.toUpperCase() || "Unknown",
        message,
        actionSuggestion,
      });
    }

    // Sort by severity (critical first) then by absolute delta
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      opportunity: 2,
      info: 3,
    };

    alerts.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return Math.abs(b.priceDeltaPercent) - Math.abs(a.priceDeltaPercent);
    });

    // Apply limit
    const limitedAlerts = alerts.slice(0, limit);

    // Calculate summary
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
      opportunity: alerts.filter((a) => a.severity === "opportunity").length,
      potentialSavingsGbp: alerts
        .filter((a) => a.alertType === "too_expensive")
        .reduce((sum, a) => sum + Math.abs(a.priceDeltaGbp), 0),
      potentialRevenueGbp: alerts
        .filter((a) => a.alertType === "too_cheap")
        .reduce((sum, a) => sum + Math.abs(a.priceDeltaGbp), 0),
    };

    const response: PriceDeltaAlertsResponse = {
      alerts: limitedAlerts,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching price delta alerts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
