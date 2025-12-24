import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, gte, lte, ilike, sql, desc, asc, or } from "drizzle-orm";

/**
 * GET /api/rates
 * Search and filter rates across all providers
 *
 * Query params:
 * - capCode: Filter by exact CAP code
 * - manufacturer: Filter by manufacturer (case insensitive)
 * - model: Filter by model name (case insensitive, partial match)
 * - fuelType: Filter by fuel type (Electric, Petrol, Diesel, Hybrid)
 * - contractType: Filter by contract type (CH, CHNM, PCH, PCHNM, BSSNL)
 * - term: Filter by term (24, 36, 48, 60)
 * - mileage: Filter by annual mileage
 * - minPrice: Minimum monthly rental in GBP
 * - maxPrice: Maximum monthly rental in GBP
 * - bodyStyle: Filter by body style
 * - provider: Filter by provider code
 * - sort: Sort field (price, manufacturer, co2)
 * - order: Sort order (asc, desc)
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const capCode = searchParams.get("capCode");
    const manufacturer = searchParams.get("manufacturer");
    const model = searchParams.get("model");
    const fuelType = searchParams.get("fuelType");
    const contractType = searchParams.get("contractType");
    const term = searchParams.get("term");
    const mileage = searchParams.get("mileage");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const bodyStyle = searchParams.get("bodyStyle");
    const provider = searchParams.get("provider");
    const sort = searchParams.get("sort") || "price";
    const order = searchParams.get("order") || "asc";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build conditions
    const conditions = [];

    // Only get rates from latest imports
    conditions.push(
      sql`${providerRates.importId} IN (
        SELECT id FROM ratebook_imports WHERE is_latest = true
      )`
    );

    if (capCode) {
      conditions.push(eq(providerRates.capCode, capCode));
    }
    if (manufacturer) {
      conditions.push(ilike(providerRates.manufacturer, manufacturer));
    }
    if (model) {
      conditions.push(ilike(providerRates.model, `%${model}%`));
    }
    if (fuelType) {
      conditions.push(eq(providerRates.fuelType, fuelType));
    }
    if (contractType) {
      conditions.push(eq(providerRates.contractType, contractType));
    }
    if (term) {
      conditions.push(eq(providerRates.term, parseInt(term)));
    }
    if (mileage) {
      conditions.push(eq(providerRates.annualMileage, parseInt(mileage)));
    }
    if (minPrice) {
      conditions.push(gte(providerRates.totalRental, Math.round(parseFloat(minPrice) * 100)));
    }
    if (maxPrice) {
      conditions.push(lte(providerRates.totalRental, Math.round(parseFloat(maxPrice) * 100)));
    }
    if (bodyStyle) {
      conditions.push(ilike(providerRates.bodyStyle, `%${bodyStyle}%`));
    }
    if (provider) {
      conditions.push(eq(providerRates.providerCode, provider));
    }

    // Determine sort column and order
    let orderBy;
    const sortColumn = {
      price: providerRates.totalRental,
      manufacturer: providerRates.manufacturer,
      co2: providerRates.co2Gkm,
      term: providerRates.term,
    }[sort] || providerRates.totalRental;

    orderBy = order === "desc" ? desc(sortColumn) : asc(sortColumn);

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
        totalRental: providerRates.totalRental,
        leaseRental: providerRates.leaseRental,
        serviceRental: providerRates.serviceRental,
        co2Gkm: providerRates.co2Gkm,
        p11d: providerRates.p11d,
        fuelType: providerRates.fuelType,
        transmission: providerRates.transmission,
        bodyStyle: providerRates.bodyStyle,
        excessMileagePpm: providerRates.excessMileagePpm,
        bikTaxLowerRate: providerRates.bikTaxLowerRate,
        bikTaxHigherRate: providerRates.bikTaxHigherRate,
        insuranceGroup: providerRates.insuranceGroup,
      })
      .from(providerRates)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(providerRates)
      .where(and(...conditions));

    // Transform prices to GBP
    const transformedRates = rates.map((r) => ({
      ...r,
      totalRentalGbp: r.totalRental / 100,
      leaseRentalGbp: r.leaseRental ? r.leaseRental / 100 : null,
      serviceRentalGbp: r.serviceRental ? r.serviceRental / 100 : null,
      p11dGbp: r.p11d ? r.p11d / 100 : null,
      excessMileagePence: r.excessMileagePpm,
      bikTaxLowerRateGbp: r.bikTaxLowerRate ? r.bikTaxLowerRate / 100 : null,
      bikTaxHigherRateGbp: r.bikTaxHigherRate ? r.bikTaxHigherRate / 100 : null,
    }));

    return NextResponse.json({
      rates: transformedRates,
      pagination: {
        total: Number(countResult?.count || 0),
        limit,
        offset,
        hasMore: offset + rates.length < Number(countResult?.count || 0),
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
