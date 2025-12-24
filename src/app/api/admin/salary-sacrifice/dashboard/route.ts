// src/app/api/admin/salary-sacrifice/dashboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { calculateSalarySacrificeScore } from "@/lib/rates/scoring";

export async function GET() {
  try {
    // Get stats
    const [statsResult] = await db
      .select({
        totalRates: sql<number>`count(*)`,
        evRates: sql<number>`count(*) filter (where ${providerRates.co2Gkm} = 0 OR ${providerRates.fuelType} ILIKE '%electric%')`,
        providers: sql<number>`count(distinct ${providerRates.providerCode})`,
        averageBik: sql<number>`avg(${providerRates.bikPercent}::numeric)`,
      })
      .from(providerRates)
      .innerJoin(
        ratebookImports,
        and(
          eq(providerRates.importId, ratebookImports.id),
          eq(ratebookImports.isLatest, true)
        )
      )
      .where(eq(providerRates.contractType, "BSSNL"));

    // Get top EV deals
    const topDealsRaw = await db
      .select({
        id: providerRates.id,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        providerCode: providerRates.providerCode,
        totalRental: providerRates.totalRental,
        bikPercent: providerRates.bikPercent,
        bikTaxLowerRate: providerRates.bikTaxLowerRate,
        co2Gkm: providerRates.co2Gkm,
        fuelType: providerRates.fuelType,
        p11d: providerRates.p11d,
        term: providerRates.term,
      })
      .from(providerRates)
      .innerJoin(
        ratebookImports,
        and(
          eq(providerRates.importId, ratebookImports.id),
          eq(ratebookImports.isLatest, true)
        )
      )
      .where(
        and(
          eq(providerRates.contractType, "BSSNL"),
          sql`(${providerRates.co2Gkm} = 0 OR ${providerRates.fuelType} ILIKE '%electric%')`
        )
      )
      .orderBy(providerRates.totalRental)
      .limit(10);

    const topDeals = topDealsRaw.map((deal) => {
      const isZeroEmission = deal.co2Gkm === 0 || deal.fuelType?.toLowerCase().includes("electric");
      const scoreResult = calculateSalarySacrificeScore(
        deal.totalRental,
        deal.term,
        deal.p11d,
        deal.bikPercent ? parseFloat(deal.bikPercent) : null,
        deal.bikTaxLowerRate,
        isZeroEmission || false
      );

      return {
        id: deal.id,
        manufacturer: deal.manufacturer,
        model: deal.model,
        variant: deal.variant,
        providerCode: deal.providerCode,
        grossDeductionFormatted: (deal.totalRental / 100).toFixed(0),
        bikPercentFormatted: deal.bikPercent || "0",
        bikTaxMonthly: deal.bikTaxLowerRate ? (deal.bikTaxLowerRate / 100).toFixed(0) : null,
        score: scoreResult.score,
        isZeroEmission: isZeroEmission || false,
      };
    });

    return NextResponse.json({
      totalRates: Number(statsResult.totalRates),
      evRates: Number(statsResult.evRates),
      providers: Number(statsResult.providers),
      averageBik: statsResult.averageBik ? Number(statsResult.averageBik) : 0,
      topDeals,
    });
  } catch (error) {
    console.error("Error fetching SS dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
