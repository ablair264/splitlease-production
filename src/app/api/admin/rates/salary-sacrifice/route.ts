// src/app/api/admin/rates/salary-sacrifice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, desc, sql } from "drizzle-orm";
import { calculateSalarySacrificeScore } from "@/lib/rates/scoring";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  // Filters
  const search = searchParams.get("search");
  const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean);
  const providers = searchParams.get("providers")?.split(",").filter(Boolean);
  const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean);
  const terms = searchParams.get("terms")?.split(",").map(Number).filter(Boolean);
  const taxRate = searchParams.get("taxRate") || "20"; // 20 or 40
  const evOnly = searchParams.get("evOnly") === "true";
  const maxBik = searchParams.get("maxBik") ? parseFloat(searchParams.get("maxBik")!) : null;

  try {
    // Build where conditions - ONLY BSSNL
    const conditions = [
      eq(providerRates.contractType, "BSSNL"),
    ];

    if (search) {
      conditions.push(
        sql`(${providerRates.manufacturer} ILIKE ${`%${search}%`} OR
            ${providerRates.model} ILIKE ${`%${search}%`} OR
            ${providerRates.variant} ILIKE ${`%${search}%`} OR
            ${providerRates.capCode} ILIKE ${`%${search}%`})`
      );
    }

    if (manufacturers?.length) {
      conditions.push(inArray(providerRates.manufacturer, manufacturers));
    }

    if (providers?.length) {
      conditions.push(inArray(providerRates.providerCode, providers));
    }

    if (fuelTypes?.length) {
      conditions.push(inArray(providerRates.fuelType, fuelTypes));
    }

    if (terms?.length) {
      conditions.push(inArray(providerRates.term, terms));
    }

    if (evOnly) {
      conditions.push(
        sql`(${providerRates.fuelType} ILIKE '%electric%' OR ${providerRates.co2Gkm} = 0)`
      );
    }

    if (maxBik !== null) {
      conditions.push(lte(providerRates.bikPercent, maxBik.toString()));
    }

    // Get rates
    const rates = await db
      .select({
        id: providerRates.id,
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        providerCode: providerRates.providerCode,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        paymentPlan: providerRates.paymentPlan,
        totalRental: providerRates.totalRental,
        p11d: providerRates.p11d,
        fuelType: providerRates.fuelType,
        co2Gkm: providerRates.co2Gkm,
        bikPercent: providerRates.bikPercent,
        bikTaxLowerRate: providerRates.bikTaxLowerRate,
        bikTaxHigherRate: providerRates.bikTaxHigherRate,
        bodyStyle: providerRates.bodyStyle,
      })
      .from(providerRates)
      .innerJoin(
        ratebookImports,
        and(
          eq(providerRates.importId, ratebookImports.id),
          eq(ratebookImports.isLatest, true)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(providerRates.totalRental))
      .limit(pageSize)
      .offset(offset);

    // Calculate SS-specific scores
    const ratesWithScores = rates.map((rate) => {
      const bikTax = taxRate === "40" ? rate.bikTaxHigherRate : rate.bikTaxLowerRate;
      const isZeroEmission = rate.co2Gkm === 0 || rate.fuelType?.toLowerCase().includes("electric");

      const scoreResult = calculateSalarySacrificeScore(
        rate.totalRental,
        rate.term,
        rate.p11d,
        rate.bikPercent ? parseFloat(rate.bikPercent) : null,
        bikTax,
        isZeroEmission || false
      );

      return {
        ...rate,
        grossDeductionFormatted: (rate.totalRental / 100).toFixed(2),
        bikTaxMonthly: bikTax ? (bikTax / 100).toFixed(2) : null,
        bikPercentFormatted: rate.bikPercent,
        isZeroEmission,
        score: scoreResult.score,
        scoreRank: scoreResult.score >= 85 ? "best" :
                   scoreResult.score >= 70 ? "good" :
                   scoreResult.score >= 50 ? "average" : "poor",
      };
    });

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(providerRates)
      .innerJoin(
        ratebookImports,
        and(
          eq(providerRates.importId, ratebookImports.id),
          eq(ratebookImports.isLatest, true)
        )
      )
      .where(and(...conditions));

    // Get filter options
    const filterOptions = await getSalarySacrificeFilterOptions();

    return NextResponse.json({
      rates: ratesWithScores,
      pagination: {
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      },
      filterOptions,
    });
  } catch (error) {
    console.error("Error fetching salary sacrifice rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}

async function getSalarySacrificeFilterOptions() {
  const [manufacturers, providers, fuelTypes] = await Promise.all([
    db
      .selectDistinct({ value: providerRates.manufacturer })
      .from(providerRates)
      .where(eq(providerRates.contractType, "BSSNL"))
      .orderBy(providerRates.manufacturer),
    db
      .selectDistinct({ value: providerRates.providerCode })
      .from(providerRates)
      .where(eq(providerRates.contractType, "BSSNL"))
      .orderBy(providerRates.providerCode),
    db
      .selectDistinct({ value: providerRates.fuelType })
      .from(providerRates)
      .where(sql`${providerRates.fuelType} IS NOT NULL AND ${providerRates.contractType} = 'BSSNL'`)
      .orderBy(providerRates.fuelType),
  ]);

  return {
    manufacturers: manufacturers.map((m) => m.value),
    providers: providers.map((p) => p.value),
    fuelTypes: fuelTypes.map((f) => f.value).filter(Boolean),
    terms: [24, 36, 48, 60],
    taxRates: [20, 40],
    bikRanges: [
      { label: "0% (Zero Emission)", value: 0 },
      { label: "≤2%", value: 2 },
      { label: "≤5%", value: 5 },
      { label: "≤10%", value: 10 },
    ],
  };
}
