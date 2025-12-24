import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates } from "@/lib/db/schema";
import { eq, and, gte, lte, ilike, sql, desc, asc, inArray } from "drizzle-orm";
import { getContractTypesForFilters, VAN_BODY_TYPES } from "@/lib/rates/types";
import type { ContractTab, VehicleCategory } from "@/lib/rates/types";

/**
 * GET /api/admin/rates
 * Browse rates with comprehensive filtering for admin dashboard
 *
 * Query params:
 * - tab: contract-hire | personal-contract-hire | salary-sacrifice
 * - withMaintenance: true/false
 * - vehicleCategory: cars | vans | all (default: cars)
 * - providers: comma-separated provider codes (lex, ogilvie)
 * - manufacturers: comma-separated manufacturer names
 * - models: comma-separated model names
 * - fuelTypes: comma-separated fuel types
 * - bodyTypes: comma-separated body types
 * - terms: comma-separated terms (24,36,48,60)
 * - mileages: comma-separated mileages
 * - minPrice: Minimum monthly rental in GBP
 * - maxPrice: Maximum monthly rental in GBP
 * - minInsurance: Min insurance group
 * - maxInsurance: Max insurance group
 * - minCo2: Min CO2 g/km
 * - maxCo2: Max CO2 g/km
 * - minEvRange: Min EV range miles
 * - minP11d: Min P11D in GBP
 * - maxP11d: Max P11D in GBP
 * - sort: Column to sort by
 * - order: asc or desc
 * - page: Page number (1-indexed)
 * - pageSize: Results per page (default: 50, max: 100)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Parse tab and maintenance toggle
    const tab = (searchParams.get("tab") || "contract-hire") as ContractTab;
    const withMaintenance = searchParams.get("withMaintenance") !== "false";

    // Get contract types based on tab and maintenance toggle
    const contractTypes = getContractTypesForFilters(tab, withMaintenance);

    // Parse new filters: vehicle category and providers
    const vehicleCategory = (searchParams.get("vehicleCategory") || "cars") as VehicleCategory;
    const providers = searchParams.get("providers")?.split(",").filter(Boolean) || [];

    // Parse filter parameters
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const models = searchParams.get("models")?.split(",").filter(Boolean) || [];
    const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean) || [];
    const bodyTypes = searchParams.get("bodyTypes")?.split(",").filter(Boolean) || [];
    const terms = searchParams.get("terms")?.split(",").map(Number).filter(Boolean) || [];
    const mileages = searchParams.get("mileages")?.split(",").map(Number).filter(Boolean) || [];

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minInsurance = searchParams.get("minInsurance");
    const maxInsurance = searchParams.get("maxInsurance");
    const minCo2 = searchParams.get("minCo2");
    const maxCo2 = searchParams.get("maxCo2");
    const minEvRange = searchParams.get("minEvRange");
    const minP11d = searchParams.get("minP11d");
    const maxP11d = searchParams.get("maxP11d");

    // Sorting
    const sortField = searchParams.get("sort") || "totalRental";
    const sortOrder = searchParams.get("order") || "asc";

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [];

    // Only get rates from latest imports
    conditions.push(
      sql`${providerRates.importId} IN (
        SELECT id FROM ratebook_imports WHERE is_latest = true
      )`
    );

    // Contract types (based on tab and maintenance toggle)
    if (contractTypes.length > 0) {
      conditions.push(inArray(providerRates.contractType, contractTypes));
    }

    // Provider filter
    if (providers.length > 0) {
      conditions.push(inArray(providerRates.providerCode, providers));
    }

    // Vehicle category filter (cars vs vans)
    if (vehicleCategory === "cars") {
      // Exclude van body types
      const vanConditions = VAN_BODY_TYPES.map((vbt) =>
        ilike(providerRates.bodyStyle, `%${vbt}%`)
      );
      conditions.push(
        sql`NOT (${sql.join(vanConditions, sql` OR `)} OR ${providerRates.bodyStyle} IS NULL)`
      );
    } else if (vehicleCategory === "vans") {
      // Only include van body types
      const vanConditions = VAN_BODY_TYPES.map((vbt) =>
        ilike(providerRates.bodyStyle, `%${vbt}%`)
      );
      conditions.push(sql`(${sql.join(vanConditions, sql` OR `)})`);
    }
    // vehicleCategory === "all" - no filter needed

    // Multi-select filters
    if (manufacturers.length > 0) {
      conditions.push(inArray(providerRates.manufacturer, manufacturers.map((m) => m.toUpperCase())));
    }
    if (models.length > 0) {
      conditions.push(inArray(providerRates.model, models));
    }
    if (fuelTypes.length > 0) {
      conditions.push(inArray(providerRates.fuelType, fuelTypes));
    }
    if (bodyTypes.length > 0) {
      // Body types might be partial matches
      const bodyConditions = bodyTypes.map((bt) => ilike(providerRates.bodyStyle, `%${bt}%`));
      conditions.push(sql`(${sql.join(bodyConditions, sql` OR `)})`);
    }
    if (terms.length > 0) {
      conditions.push(inArray(providerRates.term, terms));
    }
    if (mileages.length > 0) {
      conditions.push(inArray(providerRates.annualMileage, mileages));
    }

    // Range filters
    if (minPrice) {
      conditions.push(gte(providerRates.totalRental, Math.round(parseFloat(minPrice) * 100)));
    }
    if (maxPrice) {
      conditions.push(lte(providerRates.totalRental, Math.round(parseFloat(maxPrice) * 100)));
    }
    if (minInsurance) {
      conditions.push(sql`CAST(${providerRates.insuranceGroup} AS INTEGER) >= ${parseInt(minInsurance)}`);
    }
    if (maxInsurance) {
      conditions.push(sql`CAST(${providerRates.insuranceGroup} AS INTEGER) <= ${parseInt(maxInsurance)}`);
    }
    if (minCo2) {
      conditions.push(gte(providerRates.co2Gkm, parseInt(minCo2)));
    }
    if (maxCo2) {
      conditions.push(lte(providerRates.co2Gkm, parseInt(maxCo2)));
    }
    if (minEvRange) {
      conditions.push(gte(providerRates.wltpEvRange, parseInt(minEvRange)));
    }
    if (minP11d) {
      conditions.push(gte(providerRates.p11d, Math.round(parseFloat(minP11d) * 100)));
    }
    if (maxP11d) {
      conditions.push(lte(providerRates.p11d, Math.round(parseFloat(maxP11d) * 100)));
    }

    // Determine sort column - now using stored score
    const sortColumnMap = {
      totalRental: providerRates.totalRental,
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
      co2Gkm: providerRates.co2Gkm,
      p11d: providerRates.p11d,
      term: providerRates.term,
      annualMileage: providerRates.annualMileage,
      valueScore: providerRates.score,
      score: providerRates.score,
    } as const;
    type SortKey = keyof typeof sortColumnMap;

    const sortColumn = sortColumnMap[sortField as SortKey] || providerRates.totalRental;
    const orderBy = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    // Execute query
    const rates = await db
      .select({
        id: providerRates.id,
        capCode: providerRates.capCode,
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
        insuranceGroup: providerRates.insuranceGroup,
        wltpEvRange: providerRates.wltpEvRange,
        excessMileagePpm: providerRates.excessMileagePpm,
        bikTaxLowerRate: providerRates.bikTaxLowerRate,
        bikTaxHigherRate: providerRates.bikTaxHigherRate,
        score: providerRates.score,
      })
      .from(providerRates)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(providerRates)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Helper to get score label
    const getScoreLabel = (score: number | null): string => {
      if (score === null) return "Unknown";
      if (score >= 80) return "Exceptional";
      if (score >= 65) return "Great";
      if (score >= 50) return "Good";
      if (score >= 40) return "Fair";
      return "Poor";
    };

    // Transform response using stored scores
    const transformedRates = rates.map((r) => {
      // Calculate cost ratio for display (optional)
      const costRatio = r.p11d && r.p11d > 0 && r.term > 0
        ? (r.totalRental * r.term) / r.p11d
        : null;

      return {
        id: r.id,
        capCode: r.capCode,
        providerCode: r.providerCode,
        contractType: r.contractType,
        manufacturer: r.manufacturer,
        model: r.model,
        variant: r.variant,
        term: r.term,
        annualMileage: r.annualMileage,
        paymentPlan: r.paymentPlan,
        totalRentalGbp: r.totalRental / 100,
        leaseRentalGbp: r.leaseRental ? r.leaseRental / 100 : null,
        serviceRentalGbp: r.serviceRental ? r.serviceRental / 100 : null,
        co2Gkm: r.co2Gkm,
        p11dGbp: r.p11d ? r.p11d / 100 : null,
        fuelType: r.fuelType,
        transmission: r.transmission,
        bodyStyle: r.bodyStyle,
        insuranceGroup: r.insuranceGroup,
        evRangeMiles: r.wltpEvRange,
        excessMileagePence: r.excessMileagePpm,
        bikTaxLowerRateGbp: r.bikTaxLowerRate ? r.bikTaxLowerRate / 100 : null,
        bikTaxHigherRateGbp: r.bikTaxHigherRate ? r.bikTaxHigherRate / 100 : null,
        // Value scoring - now from stored score
        valueScore: r.score ?? 50,
        valueLabel: getScoreLabel(r.score),
        costRatio,
      };
    });

    return NextResponse.json({
      rates: transformedRates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      appliedFilters: {
        tab,
        withMaintenance,
        vehicleCategory,
        providers,
        contractTypes,
        manufacturers,
        models,
        fuelTypes,
        bodyTypes,
        terms,
        mileages,
      },
    });
  } catch (error) {
    console.error("Error fetching rates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch rates" },
      { status: 500 }
    );
  }
}
