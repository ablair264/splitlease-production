import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const PROVIDER_LABELS: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus Fleet",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/rates/manufacturers/[manufacturer]/vehicles
 *
 * Returns vehicles for a specific manufacturer with prominent variant display.
 * Used when expanding a manufacturer accordion in Rate Explorer.
 *
 * Query params:
 * - contractType: CH, CHNM, PCH, PCHNM, BSSNL (default: CHNM)
 * - term: 24, 36, 48, 60 (default: 36)
 * - mileage: 5000, 8000, 10000, 15000, 20000 (default: 10000)
 * - provider: lex, ogilvie, venus (optional)
 * - fuelType: Petrol, Diesel, Electric, Hybrid (optional)
 * - scoreMin: Minimum score filter (optional)
 * - page: Page number (default: 1)
 * - pageSize: Results per page (default: 20, max: 50)
 * - sort: score (default), price, model, variant
 * - order: desc (default for score), asc (default for others)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ manufacturer: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { manufacturer } = await params;
    const decodedManufacturer = decodeURIComponent(manufacturer).toUpperCase();
    const { searchParams } = new URL(req.url);

    // Parse filters
    const contractType = searchParams.get("contractType") || "CHNM";
    const term = parseInt(searchParams.get("term") || "36");
    const mileage = parseInt(searchParams.get("mileage") || "10000");
    const provider = searchParams.get("provider");
    const fuelType = searchParams.get("fuelType");
    const scoreMin = searchParams.get("scoreMin") ? parseInt(searchParams.get("scoreMin")!) : null;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const offset = (page - 1) * pageSize;

    // Sorting
    const sortField = searchParams.get("sort") || "score";
    const defaultOrder = sortField === "score" || sortField === "price" ? "desc" : "asc";
    const sortOrder = searchParams.get("order") || defaultOrder;

    // Build WHERE conditions
    const conditions: string[] = [
      `ri.is_latest = true`,
      `pr.manufacturer = '${decodedManufacturer}'`,
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

    const whereClause = conditions.join(" AND ");

    // Value score calculation
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

    // Sort mapping - note we're grouping by CAP code to get best deal per vehicle
    const sortMap: Record<string, string> = {
      score: `best_score`,
      price: `best_price`,
      model: `model`,
      variant: `variant`,
    };
    const sortColumn = sortMap[sortField] || "best_score";
    const orderDir = sortOrder === "asc" ? "ASC" : "DESC";

    // Main query - group by CAP code to get best deal per vehicle variant
    const result = await db.execute(sql.raw(`
      WITH vehicle_best AS (
        SELECT
          pr.cap_code,
          pr.model,
          pr.variant,
          pr.fuel_type,
          pr.transmission,
          pr.body_style,
          pr.co2_gkm,
          MAX(pr.p11d) AS p11d,
          MIN(pr.total_rental) AS best_price,
          MAX(${valueScoreSQL}) AS best_score,
          array_agg(DISTINCT pr.provider_code) AS providers,
          v.image_folder
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id
        LEFT JOIN vehicles v ON v.cap_code = pr.cap_code
        WHERE ${whereClause}
        GROUP BY
          pr.cap_code,
          pr.model,
          pr.variant,
          pr.fuel_type,
          pr.transmission,
          pr.body_style,
          pr.co2_gkm,
          v.image_folder
        ${havingClause}
      )
      SELECT * FROM vehicle_best
      ORDER BY ${sortColumn} ${orderDir} NULLS LAST, model ASC, variant ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `));

    // Count total vehicles for this manufacturer
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(DISTINCT pr.cap_code) AS total
      FROM provider_rates pr
      JOIN ratebook_imports ri ON ri.id = pr.import_id
      WHERE ${whereClause}
      ${scoreMin ? `AND (${valueScoreSQL}) >= ${scoreMin}` : ""}
    `));

    const total = Number((countResult.rows[0] as { total: number })?.total || 0);

    // Transform results with variant prominence
    const vehicles = (result.rows as Array<{
      cap_code: string;
      model: string;
      variant: string | null;
      fuel_type: string | null;
      transmission: string | null;
      body_style: string | null;
      co2_gkm: number | null;
      p11d: string | null;
      best_price: string;
      best_score: string;
      providers: string[];
      image_folder: string | null;
    }>).map((row) => {
      const score = Number(row.best_score);
      let scoreLabel = "Average";
      if (score >= 80) scoreLabel = "Hot";
      else if (score >= 65) scoreLabel = "Great";
      else if (score >= 50) scoreLabel = "Good";
      else if (score >= 40) scoreLabel = "Fair";

      return {
        capCode: row.cap_code,
        model: row.model,
        // VARIANT IS PROMINENT - shown as main display text
        variant: row.variant,
        displayName: row.variant
          ? `${row.model} ${row.variant}`
          : row.model,
        fuelType: row.fuel_type,
        transmission: row.transmission,
        bodyStyle: row.body_style,
        co2Gkm: row.co2_gkm,
        p11dGbp: row.p11d ? Math.round(Number(row.p11d) / 100) : null,
        bestPriceGbp: Math.round(Number(row.best_price) / 100),
        score,
        scoreLabel,
        providers: (row.providers || []).map((p) => ({
          code: p,
          name: PROVIDER_LABELS[p] || p.toUpperCase(),
        })),
        imageUrl: row.image_folder
          ? `/images/vehicles/${row.image_folder}/front_view.webp`
          : null,
      };
    });

    return NextResponse.json({
      manufacturer: decodedManufacturer,
      vehicles,
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
        sort: sortField,
        order: sortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching manufacturer vehicles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}
