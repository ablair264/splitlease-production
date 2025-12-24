// src/app/api/admin/rates/compare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { calculateMultiTermScores } from "@/lib/rates/scoring";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const capCode = searchParams.get("capCode");
  const contractType = searchParams.get("contractType") || "all";
  const annualMileage = parseInt(searchParams.get("mileage") || "8000");

  if (!capCode) {
    return NextResponse.json(
      { error: "capCode is required" },
      { status: 400 }
    );
  }

  try {
    // Build conditions
    const conditions = [
      eq(providerRates.capCode, capCode),
      eq(providerRates.annualMileage, annualMileage),
    ];

    if (contractType !== "all") {
      if (contractType === "BSSNL") {
        conditions.push(eq(providerRates.contractType, "BSSNL"));
      } else {
        conditions.push(sql`${providerRates.contractType} != 'BSSNL'`);
      }
    }

    // Get all rates for this vehicle
    const rates = await db
      .select({
        id: providerRates.id,
        providerCode: providerRates.providerCode,
        contractType: providerRates.contractType,
        term: providerRates.term,
        paymentPlan: providerRates.paymentPlan,
        totalRental: providerRates.totalRental,
        leaseRental: providerRates.leaseRental,
        serviceRental: providerRates.serviceRental,
        p11d: providerRates.p11d,
        basicListPrice: providerRates.basicListPrice,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        fuelType: providerRates.fuelType,
        wltpEvRange: providerRates.wltpEvRange,
        fuelEcoCombined: providerRates.fuelEcoCombined,
      })
      .from(providerRates)
      .innerJoin(
        ratebookImports,
        and(
          eq(providerRates.importId, ratebookImports.id),
          eq(ratebookImports.isLatest, true)
        )
      )
      .where(and(...conditions));

    if (rates.length === 0) {
      return NextResponse.json({
        capCode,
        vehicle: null,
        comparison: [],
      });
    }

    // Get unique providers
    const providers = Array.from(new Set(rates.map((r) => r.providerCode)));

    // Get unique terms
    const terms = Array.from(new Set(rates.map((r) => r.term))).sort((a, b) => a - b);

    // Build comparison matrix: provider × term
    const comparison = providers.map((provider) => {
      const providerRatesFiltered = rates.filter((r) => r.providerCode === provider);

      const termPrices: Record<number, {
        price: number;
        priceFormatted: string;
        score: number;
        paymentPlan: string;
        isBest: boolean;
      }> = {};

      terms.forEach((term) => {
        const rateForTerm = providerRatesFiltered.find((r) => r.term === term);
        if (rateForTerm) {
          const scores = calculateMultiTermScores([{
            term: rateForTerm.term,
            monthlyRentalPence: rateForTerm.totalRental,
            paymentPlan: rateForTerm.paymentPlan,
            basicListPricePence: rateForTerm.basicListPrice,
            p11dPence: rateForTerm.p11d,
            contractType: rateForTerm.contractType,
            manufacturer: rateForTerm.manufacturer,
            fuelType: rateForTerm.fuelType,
            evRangeMiles: rateForTerm.wltpEvRange,
            fuelEcoMpg: rateForTerm.fuelEcoCombined ? parseFloat(rateForTerm.fuelEcoCombined) : null,
          }]);

          termPrices[term] = {
            price: rateForTerm.totalRental,
            priceFormatted: `£${(rateForTerm.totalRental / 100).toFixed(0)}`,
            score: scores[0]?.score || 0,
            paymentPlan: rateForTerm.paymentPlan,
            isBest: false,
          };
        }
      });

      return {
        provider,
        terms: termPrices,
      };
    });

    // Mark best price for each term
    terms.forEach((term) => {
      let bestPrice = Infinity;
      let bestProviderIdx = -1;

      comparison.forEach((c, idx) => {
        if (c.terms[term] && c.terms[term].price < bestPrice) {
          bestPrice = c.terms[term].price;
          bestProviderIdx = idx;
        }
      });

      if (bestProviderIdx >= 0) {
        comparison[bestProviderIdx].terms[term].isBest = true;
      }
    });

    // Vehicle info from first rate
    const firstRate = rates[0];

    return NextResponse.json({
      capCode,
      vehicle: {
        manufacturer: firstRate.manufacturer,
        model: firstRate.model,
        variant: firstRate.variant,
        p11d: firstRate.p11d,
      },
      terms,
      providers,
      comparison,
    });
  } catch (error) {
    console.error("Error building comparison:", error);
    return NextResponse.json(
      { error: "Failed to build comparison" },
      { status: 500 }
    );
  }
}
