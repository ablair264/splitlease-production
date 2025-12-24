import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, fleetMarqueTerms, providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, sql, desc, asc, ilike, inArray, or } from "drizzle-orm";
import { VAN_BODY_TYPES } from "@/lib/rates/types";

export type VehicleMatrixRow = {
  id: string;
  capCode: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  // Specs
  co2: number | null;
  p11d: number | null;
  insuranceGroup: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  mpg: string | null;
  // Lex codes
  lexMakeCode: string | null;
  lexModelCode: string | null;
  lexVariantCode: string | null;
  // Availability flags
  hasFleetDiscount: boolean;
  fleetDiscountPercent: number | null;
  fleetDiscountedPrice: number | null;
  hasLexCodes: boolean;
  hasOgilvieRates: boolean;
  hasLexRates: boolean;
  hasVenusRates: boolean;
  // Aggregated stats
  rateCount: number;
  avgValueScore: number | null;
  minMonthlyRental: number | null;
  maxMonthlyRental: number | null;
};

/**
 * GET /api/admin/vehicle-matrix
 * Vehicle-centric view aggregating all pricing sources
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Filters
    const search = searchParams.get("search") || "";
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const vehicleCategory = searchParams.get("vehicleCategory") || "cars";
    const providers = searchParams.get("providers")?.split(",").filter(Boolean) || [];
    const hasRates = searchParams.get("hasRates");

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
    const offset = (page - 1) * pageSize;

    // Sort
    const sortField = searchParams.get("sort") || "manufacturer";
    const sortOrder = searchParams.get("order") || "asc";

    // Determine sort column
    const getSortColumn = () => {
      switch (sortField) {
        case 'model': return 'v.model';
        case 'avgScore': return 'vs.avg_value_score';
        case 'minPrice': return 'vs.min_rental';
        case 'rateCount': return 'vs.rate_count';
        default: return 'v.manufacturer';
      }
    };
    const sortColumn = getSortColumn();
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Build vehicle query with aggregations
    // Uses vehicle_id FK on provider_rates for direct joins (no cap_code bridging needed)
    const vehicleRows = await db.execute(sql`
      WITH fleet_terms AS (
        -- fleet_marque_terms.cap_code is actually the cap_id from ogilvie_cap_mappings
        -- Need to join through ogilvie_cap_mappings to get the vehicle's cap_code
        SELECT
          ocm.cap_code as vehicle_cap_code,
          fmt.discount_percent::float as discount_percent,
          fmt.discounted_price
        FROM fleet_marque_terms fmt
        JOIN ogilvie_cap_mappings ocm ON ocm.cap_id = fmt.cap_code
      ),
      -- Provider rates stats - now using direct vehicle_id join
      provider_stats AS (
        SELECT
          pr.vehicle_id,
          pr.provider_code,
          COUNT(*) as rate_count,
          AVG(
            CASE
              WHEN COALESCE(pr.p11d, v.p11d) IS NULL OR COALESCE(pr.p11d, v.p11d) <= 0 OR pr.term <= 0 THEN 50
              ELSE
                CASE
                  WHEN (pr.total_rental::float * pr.term) / COALESCE(pr.p11d, v.p11d) < 0.28 THEN 85
                  WHEN (pr.total_rental::float * pr.term) / COALESCE(pr.p11d, v.p11d) < 0.38 THEN 70
                  WHEN (pr.total_rental::float * pr.term) / COALESCE(pr.p11d, v.p11d) < 0.48 THEN 55
                  ELSE 40
                END
            END
          ) as avg_value_score,
          MIN(pr.total_rental) as min_rental,
          MAX(pr.total_rental) as max_rental
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        LEFT JOIN vehicles v ON v.id = pr.vehicle_id
        WHERE pr.vehicle_id IS NOT NULL
        GROUP BY pr.vehicle_id, pr.provider_code
      ),
      -- Aggregate stats per vehicle across all providers
      vehicle_stats AS (
        SELECT
          vehicle_id,
          SUM(rate_count) as rate_count,
          SUM(avg_value_score * rate_count) / NULLIF(SUM(rate_count), 0) as avg_value_score,
          MIN(min_rental) as min_rental,
          MAX(max_rental) as max_rental,
          BOOL_OR(provider_code = 'ogilvie') as has_ogilvie,
          BOOL_OR(provider_code = 'lex') as has_lex_rates,
          BOOL_OR(provider_code = 'venus') as has_venus
        FROM provider_stats
        GROUP BY vehicle_id
      ),
      -- Live Lex quotes (from lex_quotes table)
      lex_quotes_stats AS (
        SELECT
          lq.vehicle_id,
          COUNT(*) as quote_count
        FROM lex_quotes lq
        WHERE lq.status = 'success'
        GROUP BY lq.vehicle_id
      )
      SELECT
        v.id,
        v.cap_code,
        v.manufacturer,
        v.model,
        v.variant,
        v.co2,
        v.p11d,
        v.insurance_group,
        v.fuel_type,
        v.transmission,
        v.body_style,
        v.mpg,
        v.lex_make_code,
        v.lex_model_code,
        v.lex_variant_code,
        ft.discount_percent as fleet_discount_percent,
        ft.discounted_price as fleet_discounted_price,
        COALESCE(vs.rate_count, 0) + COALESCE(lqs.quote_count, 0) as rate_count,
        vs.avg_value_score,
        vs.min_rental,
        vs.max_rental,
        COALESCE(vs.has_ogilvie, false) as has_ogilvie,
        COALESCE(vs.has_lex_rates, false) OR lqs.vehicle_id IS NOT NULL as has_lex_rates,
        COALESCE(vs.has_venus, false) as has_venus
      FROM vehicles v
      LEFT JOIN fleet_terms ft ON ft.vehicle_cap_code = v.cap_code
      LEFT JOIN vehicle_stats vs ON vs.vehicle_id = v.id
      LEFT JOIN lex_quotes_stats lqs ON lqs.vehicle_id = v.id
      WHERE 1=1
        ${search ? sql`AND (
          v.manufacturer ILIKE ${'%' + search + '%'} OR
          v.model ILIKE ${'%' + search + '%'} OR
          v.variant ILIKE ${'%' + search + '%'} OR
          v.cap_code ILIKE ${'%' + search + '%'}
        )` : sql``}
        ${manufacturers.length > 0 ? sql`AND v.manufacturer IN (${sql.join(manufacturers.map(m => sql`${m}`), sql`, `)})` : sql``}
        ${vehicleCategory === 'cars' ? sql`AND (v.body_style IS NULL OR NOT (${sql.join(VAN_BODY_TYPES.map(vbt => sql`v.body_style ILIKE ${'%' + vbt + '%'}`), sql` OR `)}))` : sql``}
        ${vehicleCategory === 'vans' ? sql`AND (${sql.join(VAN_BODY_TYPES.map(vbt => sql`v.body_style ILIKE ${'%' + vbt + '%'}`), sql` OR `)})` : sql``}
        ${providers.length > 0 ? sql`AND (
          ${sql.join(
            providers.map(p => {
              if (p === 'lex') return sql`COALESCE(vs.has_lex_rates, false) OR lqs.vehicle_id IS NOT NULL`;
              if (p === 'ogilvie') return sql`COALESCE(vs.has_ogilvie, false)`;
              if (p === 'venus') return sql`COALESCE(vs.has_venus, false)`;
              return sql`false`;
            }),
            sql` OR `
          )}
        )` : sql``}
        ${hasRates === 'true' ? sql`AND (COALESCE(vs.rate_count, 0) + COALESCE(lqs.quote_count, 0)) > 0` : sql``}
        ${hasRates === 'false' ? sql`AND (COALESCE(vs.rate_count, 0) + COALESCE(lqs.quote_count, 0)) = 0` : sql``}
      ORDER BY ${sql.raw(sortColumn)} ${sql.raw(sortDirection)} NULLS LAST
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    // Get total count - using simplified vehicle_id based joins
    const countResult = await db.execute(sql`
      WITH provider_stats AS (
        SELECT
          pr.vehicle_id,
          pr.provider_code,
          COUNT(*) as rate_count
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        WHERE pr.vehicle_id IS NOT NULL
        GROUP BY pr.vehicle_id, pr.provider_code
      ),
      vehicle_stats AS (
        SELECT
          vehicle_id,
          SUM(rate_count) as rate_count,
          BOOL_OR(provider_code = 'ogilvie') as has_ogilvie,
          BOOL_OR(provider_code = 'lex') as has_lex_rates,
          BOOL_OR(provider_code = 'venus') as has_venus
        FROM provider_stats
        GROUP BY vehicle_id
      ),
      lex_quotes_stats AS (
        SELECT lq.vehicle_id, COUNT(*) as quote_count
        FROM lex_quotes lq
        WHERE lq.status = 'success'
        GROUP BY lq.vehicle_id
      )
      SELECT COUNT(*) as total
      FROM vehicles v
      LEFT JOIN vehicle_stats vs ON vs.vehicle_id = v.id
      LEFT JOIN lex_quotes_stats lqs ON lqs.vehicle_id = v.id
      WHERE 1=1
        ${search ? sql`AND (
          v.manufacturer ILIKE ${'%' + search + '%'} OR
          v.model ILIKE ${'%' + search + '%'} OR
          v.variant ILIKE ${'%' + search + '%'} OR
          v.cap_code ILIKE ${'%' + search + '%'}
        )` : sql``}
        ${manufacturers.length > 0 ? sql`AND v.manufacturer IN (${sql.join(manufacturers.map(m => sql`${m}`), sql`, `)})` : sql``}
        ${vehicleCategory === 'cars' ? sql`AND (v.body_style IS NULL OR NOT (${sql.join(VAN_BODY_TYPES.map(vbt => sql`v.body_style ILIKE ${'%' + vbt + '%'}`), sql` OR `)}))` : sql``}
        ${vehicleCategory === 'vans' ? sql`AND (${sql.join(VAN_BODY_TYPES.map(vbt => sql`v.body_style ILIKE ${'%' + vbt + '%'}`), sql` OR `)})` : sql``}
        ${providers.length > 0 ? sql`AND (
          ${sql.join(
            providers.map(p => {
              if (p === 'lex') return sql`COALESCE(vs.has_lex_rates, false) OR lqs.vehicle_id IS NOT NULL`;
              if (p === 'ogilvie') return sql`COALESCE(vs.has_ogilvie, false)`;
              if (p === 'venus') return sql`COALESCE(vs.has_venus, false)`;
              return sql`false`;
            }),
            sql` OR `
          )}
        )` : sql``}
        ${hasRates === 'true' ? sql`AND (COALESCE(vs.rate_count, 0) + COALESCE(lqs.quote_count, 0)) > 0` : sql``}
        ${hasRates === 'false' ? sql`AND (COALESCE(vs.rate_count, 0) + COALESCE(lqs.quote_count, 0)) = 0` : sql``}
    `);

    const total = Number((countResult.rows[0] as { total: number })?.total || 0);

    // Transform results
    const matrixRows: VehicleMatrixRow[] = (vehicleRows.rows as any[]).map((row) => ({
      id: row.id,
      capCode: row.cap_code,
      manufacturer: row.manufacturer,
      model: row.model,
      variant: row.variant,
      co2: row.co2,
      p11d: row.p11d,
      insuranceGroup: row.insurance_group,
      fuelType: row.fuel_type,
      transmission: row.transmission,
      bodyStyle: row.body_style,
      mpg: row.mpg,
      lexMakeCode: row.lex_make_code,
      lexModelCode: row.lex_model_code,
      lexVariantCode: row.lex_variant_code,
      hasFleetDiscount: row.fleet_discount_percent !== null,
      fleetDiscountPercent: row.fleet_discount_percent ? parseFloat(row.fleet_discount_percent) : null,
      fleetDiscountedPrice: row.fleet_discounted_price ? row.fleet_discounted_price / 100 : null,
      hasLexCodes: row.lex_make_code !== null,
      hasOgilvieRates: row.has_ogilvie,
      hasLexRates: row.has_lex_rates,
      hasVenusRates: row.has_venus,
      rateCount: parseInt(row.rate_count) || 0,
      avgValueScore: row.avg_value_score ? Math.round(parseFloat(row.avg_value_score)) : null,
      minMonthlyRental: row.min_rental ? row.min_rental / 100 : null,
      maxMonthlyRental: row.max_rental ? row.max_rental / 100 : null,
    }));

    // Get filter options
    const manufacturerOptions = await db.execute(sql`
      SELECT DISTINCT manufacturer FROM vehicles ORDER BY manufacturer
    `);

    return NextResponse.json({
      vehicles: matrixRows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      filterOptions: {
        manufacturers: (manufacturerOptions.rows as { manufacturer: string }[]).map(r => r.manufacturer),
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle matrix:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch vehicle matrix" },
      { status: 500 }
    );
  }
}
