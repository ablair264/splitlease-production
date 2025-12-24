import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";

/**
 * GET /api/rates/compare
 * Compare rates across providers for the same vehicle (CAP code)
 *
 * Query params:
 * - capCode: CAP code to compare (required)
 * - term: Filter by term (optional)
 * - mileage: Filter by annual mileage (optional)
 * - contractType: Filter by contract type (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const capCode = searchParams.get("capCode");
    const term = searchParams.get("term");
    const mileage = searchParams.get("mileage");
    const contractType = searchParams.get("contractType");

    if (!capCode) {
      return NextResponse.json(
        { error: "capCode parameter is required" },
        { status: 400 }
      );
    }

    // Build conditions
    const conditions = [
      eq(providerRates.capCode, capCode),
      sql`${providerRates.importId} IN (
        SELECT id FROM ratebook_imports WHERE is_latest = true
      )`,
    ];

    if (term) {
      conditions.push(eq(providerRates.term, parseInt(term)));
    }
    if (mileage) {
      conditions.push(eq(providerRates.annualMileage, parseInt(mileage)));
    }
    if (contractType) {
      conditions.push(eq(providerRates.contractType, contractType));
    }

    // Get all rates for this CAP code
    const rates = await db
      .select({
        id: providerRates.id,
        providerCode: providerRates.providerCode,
        contractType: providerRates.contractType,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        paymentPlan: providerRates.paymentPlan,
        totalRental: providerRates.totalRental,
        leaseRental: providerRates.leaseRental,
        serviceRental: providerRates.serviceRental,
        co2Gkm: providerRates.co2Gkm,
        p11d: providerRates.p11d,
        fuelType: providerRates.fuelType,
        transmission: providerRates.transmission,
        bodyStyle: providerRates.bodyStyle,
        excessMileagePpm: providerRates.excessMileagePpm,
        financeEmcPpm: providerRates.financeEmcPpm,
        serviceEmcPpm: providerRates.serviceEmcPpm,
        bikTaxLowerRate: providerRates.bikTaxLowerRate,
        bikTaxHigherRate: providerRates.bikTaxHigherRate,
        wholeLifeCost: providerRates.wholeLifeCost,
        insuranceGroup: providerRates.insuranceGroup,
      })
      .from(providerRates)
      .where(and(...conditions))
      .orderBy(asc(providerRates.totalRental));

    if (rates.length === 0) {
      return NextResponse.json({
        capCode,
        vehicle: null,
        comparison: [],
        bestDeal: null,
      });
    }

    // Get vehicle info from first rate
    const vehicleInfo = {
      capCode,
      manufacturer: rates[0].manufacturer,
      model: rates[0].model,
      variant: rates[0].variant,
      fuelType: rates[0].fuelType,
      transmission: rates[0].transmission,
      bodyStyle: rates[0].bodyStyle,
      co2Gkm: rates[0].co2Gkm,
      p11dGbp: rates[0].p11d ? rates[0].p11d / 100 : null,
      insuranceGroup: rates[0].insuranceGroup,
    };

    // Group rates by provider and contract type
    const comparison: Record<string, Record<string, typeof rates>> = {};

    for (const rate of rates) {
      const key = `${rate.providerCode}_${rate.contractType}`;
      if (!comparison[key]) {
        comparison[key] = {};
      }
      const termKey = `${rate.term}m_${rate.annualMileage}mi`;
      if (!comparison[key][termKey]) {
        comparison[key][termKey] = [];
      }
      comparison[key][termKey].push(rate);
    }

    // Transform to structured comparison
    const structuredComparison = Object.entries(comparison).map(([key, termRates]) => {
      const [provider, contract] = key.split("_");
      const allRates = Object.values(termRates).flat();
      const cheapest = allRates.reduce((min, r) =>
        r.totalRental < min.totalRental ? r : min
      );

      return {
        provider,
        contractType: contract,
        includesMaintenance: ["CH", "PCH", "BSSNL"].includes(contract),
        rateCount: allRates.length,
        cheapestRateGbp: cheapest.totalRental / 100,
        cheapestTerm: cheapest.term,
        cheapestMileage: cheapest.annualMileage,
        rates: allRates.map((r) => ({
          term: r.term,
          annualMileage: r.annualMileage,
          paymentPlan: r.paymentPlan,
          totalRentalGbp: r.totalRental / 100,
          leaseRentalGbp: r.leaseRental ? r.leaseRental / 100 : null,
          serviceRentalGbp: r.serviceRental ? r.serviceRental / 100 : null,
          excessMileagePence: r.excessMileagePpm,
          bikTaxLowerRateGbp: r.bikTaxLowerRate ? r.bikTaxLowerRate / 100 : null,
          bikTaxHigherRateGbp: r.bikTaxHigherRate ? r.bikTaxHigherRate / 100 : null,
        })),
      };
    });

    // Sort by cheapest rate
    structuredComparison.sort((a, b) => a.cheapestRateGbp - b.cheapestRateGbp);

    // Find the absolute best deal
    const bestDeal = structuredComparison.length > 0
      ? {
          provider: structuredComparison[0].provider,
          contractType: structuredComparison[0].contractType,
          monthlyGbp: structuredComparison[0].cheapestRateGbp,
          term: structuredComparison[0].cheapestTerm,
          mileage: structuredComparison[0].cheapestMileage,
        }
      : null;

    return NextResponse.json({
      capCode,
      vehicle: vehicleInfo,
      comparison: structuredComparison,
      bestDeal,
      totalRates: rates.length,
    });
  } catch (error) {
    console.error("Error comparing rates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compare rates" },
      { status: 500 }
    );
  }
}
