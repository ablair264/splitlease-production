import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates } from "@/lib/db/schema";
import { eq, and, gte, lte, ilike, sql, asc } from "drizzle-orm";

/**
 * GET /api/rates/best
 * Get the best (cheapest) rate per vehicle with filtering
 *
 * Query params:
 * - contractType: Filter by contract type (CH, CHNM, PCH, PCHNM, BSSNL)
 * - term: Filter by term (24, 36, 48, 60)
 * - mileage: Filter by annual mileage
 * - fuelType: Filter by fuel type
 * - manufacturer: Filter by manufacturer
 * - bodyStyle: Filter by body style
 * - minPrice: Minimum monthly rental in GBP
 * - maxPrice: Maximum monthly rental in GBP
 * - limit: Max results (default 50, max 200)
 * - offset: Pagination offset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const contractType = searchParams.get("contractType");
    const term = searchParams.get("term");
    const mileage = searchParams.get("mileage");
    const fuelType = searchParams.get("fuelType");
    const manufacturer = searchParams.get("manufacturer");
    const bodyStyle = searchParams.get("bodyStyle");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build WHERE conditions for the inner query
    const innerConditions: string[] = [
      "import_id IN (SELECT id FROM ratebook_imports WHERE is_latest = true)",
    ];

    if (contractType) {
      innerConditions.push(`contract_type = '${contractType}'`);
    }
    if (term) {
      innerConditions.push(`term = ${parseInt(term)}`);
    }
    if (mileage) {
      innerConditions.push(`annual_mileage = ${parseInt(mileage)}`);
    }
    if (fuelType) {
      innerConditions.push(`fuel_type ILIKE '${fuelType}'`);
    }
    if (manufacturer) {
      innerConditions.push(`manufacturer ILIKE '${manufacturer}'`);
    }
    if (bodyStyle) {
      innerConditions.push(`body_style ILIKE '%${bodyStyle}%'`);
    }
    if (minPrice) {
      innerConditions.push(`total_rental >= ${Math.round(parseFloat(minPrice) * 100)}`);
    }
    if (maxPrice) {
      innerConditions.push(`total_rental <= ${Math.round(parseFloat(maxPrice) * 100)}`);
    }

    const whereClause = innerConditions.join(" AND ");

    // Use raw SQL for the complex query with DISTINCT ON
    const bestDealsQuery = sql`
      SELECT DISTINCT ON (cap_code)
        id,
        cap_code,
        provider_code,
        contract_type,
        manufacturer,
        model,
        variant,
        term,
        annual_mileage,
        payment_plan,
        total_rental,
        lease_rental,
        service_rental,
        co2_gkm,
        p11d,
        fuel_type,
        transmission,
        body_style,
        excess_mileage_ppm,
        bik_tax_lower_rate,
        bik_tax_higher_rate,
        insurance_group,
        wltp_ev_range
      FROM provider_rates
      WHERE ${sql.raw(whereClause)}
      ORDER BY cap_code, total_rental ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const bestDeals = await db.execute(bestDealsQuery);

    // Get total unique vehicles count
    const countQuery = sql`
      SELECT COUNT(DISTINCT cap_code) as count
      FROM provider_rates
      WHERE ${sql.raw(whereClause)}
    `;

    const countResult = await db.execute(countQuery);
    const totalCount = Number((countResult.rows[0] as { count: string })?.count || 0);

    // Transform results
    const transformedDeals = (bestDeals.rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      capCode: r.cap_code,
      providerCode: r.provider_code,
      contractType: r.contract_type,
      manufacturer: r.manufacturer,
      model: r.model,
      variant: r.variant,
      term: r.term,
      annualMileage: r.annual_mileage,
      paymentPlan: r.payment_plan,
      totalRentalGbp: Number(r.total_rental) / 100,
      leaseRentalGbp: r.lease_rental ? Number(r.lease_rental) / 100 : null,
      serviceRentalGbp: r.service_rental ? Number(r.service_rental) / 100 : null,
      co2Gkm: r.co2_gkm,
      p11dGbp: r.p11d ? Number(r.p11d) / 100 : null,
      fuelType: r.fuel_type,
      transmission: r.transmission,
      bodyStyle: r.body_style,
      excessMileagePence: r.excess_mileage_ppm,
      bikTaxLowerRateGbp: r.bik_tax_lower_rate ? Number(r.bik_tax_lower_rate) / 100 : null,
      bikTaxHigherRateGbp: r.bik_tax_higher_rate ? Number(r.bik_tax_higher_rate) / 100 : null,
      insuranceGroup: r.insurance_group,
      evRangeMiles: r.wltp_ev_range,
    }));

    return NextResponse.json({
      deals: transformedDeals,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + transformedDeals.length < totalCount,
      },
      filters: {
        contractType,
        term: term ? parseInt(term) : null,
        mileage: mileage ? parseInt(mileage) : null,
        fuelType,
        manufacturer,
        bodyStyle,
        priceRangeGbp: {
          min: minPrice ? parseFloat(minPrice) : null,
          max: maxPrice ? parseFloat(maxPrice) : null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching best deals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch best deals" },
      { status: 500 }
    );
  }
}
