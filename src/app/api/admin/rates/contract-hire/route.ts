// src/app/api/admin/rates/contract-hire/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, vehicles, ratebookImports } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray, like, desc, sql } from "drizzle-orm";
import { calculateMultiTermScores, findBestTerm } from "@/lib/rates/scoring";

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
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : null;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : null;
  const minScore = searchParams.get("minScore") ? parseInt(searchParams.get("minScore")!) : null;
  const contractType = searchParams.get("contractType") || "all"; // CH, CHNM, PCH, PCHNM, all
  const withMaintenance = searchParams.get("withMaintenance"); // true, false, all

  try {
    // Build where conditions - exclude BSSNL (handled by separate endpoint)
    const conditions = [
      sql`${providerRates.contractType} != 'BSSNL'`,
    ];

    if (contractType !== "all") {
      conditions.push(eq(providerRates.contractType, contractType));
    }

    if (withMaintenance === "true") {
      conditions.push(inArray(providerRates.contractType, ["CH", "PCH"]));
    } else if (withMaintenance === "false") {
      conditions.push(inArray(providerRates.contractType, ["CHNM", "PCHNM"]));
    }

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

    if (minPrice !== null) {
      conditions.push(gte(providerRates.totalRental, minPrice * 100)); // Convert to pence
    }

    if (maxPrice !== null) {
      conditions.push(lte(providerRates.totalRental, maxPrice * 100));
    }

    // Get rates with only latest imports
    const rates = await db
      .select({
        id: providerRates.id,
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        providerCode: providerRates.providerCode,
        contractType: providerRates.contractType,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        paymentPlan: providerRates.paymentPlan,
        totalRental: providerRates.totalRental,
        p11d: providerRates.p11d,
        basicListPrice: providerRates.basicListPrice,
        fuelType: providerRates.fuelType,
        co2Gkm: providerRates.co2Gkm,
        bodyStyle: providerRates.bodyStyle,
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
      .where(and(...conditions))
      .orderBy(desc(providerRates.totalRental))
      .limit(pageSize)
      .offset(offset);

    // Calculate scores for each rate
    const ratesWithScores = rates.map((rate) => {
      const scores = calculateMultiTermScores([{
        term: rate.term,
        monthlyRentalPence: rate.totalRental,
        paymentPlan: rate.paymentPlan,
        basicListPricePence: rate.basicListPrice,
        p11dPence: rate.p11d,
        contractType: rate.contractType,
        manufacturer: rate.manufacturer,
        fuelType: rate.fuelType,
        evRangeMiles: rate.wltpEvRange,
        fuelEcoMpg: rate.fuelEcoCombined ? parseFloat(rate.fuelEcoCombined) : null,
      }]);

      return {
        ...rate,
        totalRentalFormatted: (rate.totalRental / 100).toFixed(2),
        score: scores[0]?.score || 0,
        scoreRank: scores[0]?.rank || "average",
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
    const filterOptions = await getFilterOptions();

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
    console.error("Error fetching contract hire rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}

async function getFilterOptions() {
  const [manufacturers, providers, fuelTypes] = await Promise.all([
    db
      .selectDistinct({ value: providerRates.manufacturer })
      .from(providerRates)
      .where(sql`${providerRates.contractType} != 'BSSNL'`)
      .orderBy(providerRates.manufacturer),
    db
      .selectDistinct({ value: providerRates.providerCode })
      .from(providerRates)
      .where(sql`${providerRates.contractType} != 'BSSNL'`)
      .orderBy(providerRates.providerCode),
    db
      .selectDistinct({ value: providerRates.fuelType })
      .from(providerRates)
      .where(sql`${providerRates.fuelType} IS NOT NULL AND ${providerRates.contractType} != 'BSSNL'`)
      .orderBy(providerRates.fuelType),
  ]);

  return {
    manufacturers: manufacturers.map((m) => m.value),
    providers: providers.map((p) => p.value),
    fuelTypes: fuelTypes.map((f) => f.value).filter(Boolean),
    terms: [24, 36, 48, 60],
  };
}
