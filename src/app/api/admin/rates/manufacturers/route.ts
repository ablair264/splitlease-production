import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/admin/rates/manufacturers
 *
 * Returns manufacturers grouped with summary stats for the Rate Explorer accordion.
 * Each manufacturer shows: vehicle count, best price, avg price, best score.
 *
 * Query params:
 * - contractType: CH, CHNM, PCH, PCHNM, BSSNL (default: CHNM)
 * - term: 24, 36, 48, 60 (default: 36)
 * - mileage: 5000, 8000, 10000, 15000, 20000 (default: 10000)
 * - provider: lex, ogilvie, venus (optional, filters to specific provider)
 * - fuelType: Petrol, Diesel, Electric, Hybrid, etc. (optional)
 * - scoreMin: Minimum score filter (optional)
 * - search: Search term for manufacturer name (optional)
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20, max: 50)
 * - sort: bestScore (default), vehicleCount, bestPrice, avgPrice, manufacturer
 * - order: desc (default), asc
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Parse filters
    const contractType = searchParams.get("contractType") || "CHNM";
    const term = parseInt(searchParams.get("term") || "36");
    const mileage = parseInt(searchParams.get("mileage") || "10000");
    const provider = searchParams.get("provider");
    const fuelType = searchParams.get("fuelType");
    const scoreMin = searchParams.get("scoreMin") ? parseInt(searchParams.get("scoreMin")!) : null;
    const search = searchParams.get("search");

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    // Sorting
    const sortField = searchParams.get("sort") || "bestScore";
    const sortOrder = searchParams.get("order") || "desc";

    // Build WHERE conditions
    const conditions: string[] = [
      `ri.is_latest = true`,
      `pr.contract_type = '${contractType}'`,
      `pr.term = ${term}`,
      `pr.annual_mileage = ${mileage}`,
    ];

    if (provider) {
      conditions.push(`pr.provider_code = '${provider}'`);
    }

    if (fuelType) {
      conditions.push(`pr.fuel_type = '${fuelType}'`);
    }

    if (search) {
      conditions.push(`pr.manufacturer ILIKE '%${search}%'`);
    }

    const whereClause = conditions.join(" AND ");

    // Value score calculation (rental × term / P11D ratio)
    const valueScoreSQL = `
      CASE
        WHEN pr.p11d IS NULL OR pr.p11d <= 0 OR pr.term <= 0 THEN 50
        ELSE
          CASE
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.20 THEN 95
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.28 THEN
              95 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.20) / 0.08 * 15)::int
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.38 THEN
              80 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.28) / 0.10 * 15)::int
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.48 THEN
              65 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.38) / 0.10 * 15)::int
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.58 THEN
              50 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.48) / 0.10 * 10)::int
            WHEN (pr.total_rental::float * pr.term) / pr.p11d < 0.70 THEN
              40 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.58) / 0.12 * 15)::int
            ELSE
              GREATEST(10, 25 - (((pr.total_rental::float * pr.term) / pr.p11d - 0.70) / 0.30 * 15)::int)
          END
      END
    `;

    // HAVING clause for score filter
    const havingClause = scoreMin ? `HAVING MAX(${valueScoreSQL}) >= ${scoreMin}` : "";

    // Sort mapping
    const sortMap: Record<string, string> = {
      bestScore: `best_score`,
      vehicleCount: `vehicle_count`,
      bestPrice: `best_price`,
      avgPrice: `avg_price`,
      manufacturer: `manufacturer`,
    };
    const sortColumn = sortMap[sortField] || "best_score";
    const orderDir = sortOrder === "asc" ? "ASC" : "DESC";

    // Main query - group by manufacturer
    const result = await db.execute(sql.raw(`
      WITH manufacturer_stats AS (
        SELECT
          pr.manufacturer,
          COUNT(DISTINCT pr.cap_code) AS vehicle_count,
          MIN(pr.total_rental) AS best_price,
          ROUND(AVG(pr.total_rental)) AS avg_price,
          MAX(${valueScoreSQL}) AS best_score,
          ROUND(AVG(${valueScoreSQL})) AS avg_score,
          array_agg(DISTINCT pr.provider_code) AS providers
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id
        WHERE ${whereClause}
        GROUP BY pr.manufacturer
        ${havingClause}
      )
      SELECT
        manufacturer,
        vehicle_count,
        best_price,
        avg_price,
        best_score,
        avg_score,
        providers
      FROM manufacturer_stats
      ORDER BY ${sortColumn} ${orderDir} NULLS LAST
      LIMIT ${pageSize}
      OFFSET ${offset}
    `));

    // Count total manufacturers
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(DISTINCT pr.manufacturer) AS total
      FROM provider_rates pr
      JOIN ratebook_imports ri ON ri.id = pr.import_id
      WHERE ${whereClause}
      ${scoreMin ? `AND (${valueScoreSQL}) >= ${scoreMin}` : ""}
    `));

    const total = Number((countResult.rows[0] as { total: number })?.total || 0);

    // Transform results
    const manufacturers = (result.rows as Array<{
      manufacturer: string;
      vehicle_count: string;
      best_price: string;
      avg_price: string;
      best_score: string;
      avg_score: string;
      providers: string[];
    }>).map((row) => ({
      manufacturer: row.manufacturer,
      vehicleCount: Number(row.vehicle_count),
      bestPriceGbp: Math.round(Number(row.best_price) / 100),
      avgPriceGbp: Math.round(Number(row.avg_price) / 100),
      bestScore: Number(row.best_score),
      avgScore: Number(row.avg_score),
      providers: row.providers || [],
    }));

    // Get filter options for the UI
    const providerOptions = await db.execute(sql.raw(`
      SELECT DISTINCT pr.provider_code
      FROM provider_rates pr
      JOIN ratebook_imports ri ON ri.id = pr.import_id
      WHERE ri.is_latest = true AND pr.contract_type = '${contractType}'
      ORDER BY pr.provider_code
    `));

    const fuelTypeOptions = await db.execute(sql.raw(`
      SELECT DISTINCT pr.fuel_type
      FROM provider_rates pr
      JOIN ratebook_imports ri ON ri.id = pr.import_id
      WHERE ri.is_latest = true
        AND pr.contract_type = '${contractType}'
        AND pr.fuel_type IS NOT NULL
      ORDER BY pr.fuel_type
    `));

    return NextResponse.json({
      manufacturers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      appliedFilters: {
        contractType,
        term,
        mileage,
        provider,
        fuelType,
        scoreMin,
        search,
        sort: sortField,
        order: sortOrder,
      },
      filterOptions: {
        providers: (providerOptions.rows as Array<{ provider_code: string }>)
          .map((r) => r.provider_code)
          .filter(Boolean),
        fuelTypes: (fuelTypeOptions.rows as Array<{ fuel_type: string }>)
          .map((r) => r.fuel_type)
          .filter(Boolean),
        contractTypes: ["CH", "CHNM", "PCH", "PCHNM", "BSSNL"],
        terms: [24, 36, 48, 60],
        mileages: [5000, 8000, 10000, 15000, 20000],
      },
    });
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch manufacturers" },
      { status: 500 }
    );
  }
}
