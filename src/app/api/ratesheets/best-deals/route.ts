import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const manufacturer = searchParams.get("manufacturer");
    const fuelType = searchParams.get("fuelType");
    const maxMonthly = searchParams.get("maxMonthly");
    const minScore = searchParams.get("minScore");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (manufacturer) {
      conditions.push(`v.manufacturer = $${params.length + 1}`);
      params.push(manufacturer);
    }
    if (fuelType) {
      conditions.push(`v.fuel_type = $${params.length + 1}`);
      params.push(fuelType);
    }
    if (maxMonthly) {
      conditions.push(`vp.monthly_rental <= $${params.length + 1}`);
      params.push(parseInt(maxMonthly) * 100); // Convert to pence
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query for best deals - lowest price per vehicle
    // Score formula: total lease cost as % of P11D
    // Lower % = better deal (paying less of car's value)
    // Typical good deals: 40-60% | Great deals: <40% | Poor: >80%
    const query = sql`
      WITH best_prices AS (
        SELECT DISTINCT ON (v.id)
          v.id as vehicle_id,
          v.cap_code,
          v.manufacturer,
          v.model,
          v.variant,
          v.fuel_type,
          v.transmission,
          v.co2,
          v.p11d,
          v.body_style,
          v.insurance_group,
          vp.provider_name as best_provider,
          vp.monthly_rental as best_monthly_rental,
          vp.term as term_months,
          vp.annual_mileage,
          vp.created_at as best_price_date,
          -- Calculate cost ratio (total lease / P11D as percentage)
          -- Both values are in pence, so they cancel out
          CASE
            WHEN v.p11d IS NULL OR v.p11d = 0 OR vp.monthly_rental IS NULL THEN NULL
            ELSE (vp.monthly_rental * COALESCE(vp.term, 36)::numeric / NULLIF(v.p11d, 0) * 100)
          END as cost_ratio
        FROM vehicles v
        INNER JOIN vehicle_pricing vp ON v.id = vp.vehicle_id
        ${sql.raw(whereClause)}
        ORDER BY v.id, vp.monthly_rental ASC
      ),
      scored_prices AS (
        SELECT *,
          -- Calculate score based on cost ratio
          -- If ratio > 200%, likely bad data - score as 0
          CASE
            WHEN cost_ratio IS NULL THEN 0
            WHEN cost_ratio > 200 THEN 0
            WHEN cost_ratio <= 30 THEN 100
            WHEN cost_ratio <= 40 THEN 90
            WHEN cost_ratio <= 50 THEN 80
            WHEN cost_ratio <= 60 THEN 70
            WHEN cost_ratio <= 70 THEN 60
            WHEN cost_ratio <= 80 THEN 50
            WHEN cost_ratio <= 90 THEN 40
            WHEN cost_ratio <= 100 THEN 30
            ELSE 20
          END as score
        FROM best_prices
      )
      SELECT *,
        CASE
          WHEN score >= 90 THEN 'Exceptional'
          WHEN score >= 70 THEN 'Excellent'
          WHEN score >= 50 THEN 'Good'
          WHEN score >= 30 THEN 'Fair'
          WHEN score = 0 THEN 'Data Issue'
          ELSE 'Poor'
        END as score_category
      FROM scored_prices
      ${minScore ? sql`WHERE score >= ${parseInt(minScore)}` : sql``}
      ORDER BY score DESC, best_monthly_rental ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const deals = await db.execute(query);

    // Get totals
    const countQuery = sql`
      WITH best_prices AS (
        SELECT DISTINCT ON (v.id)
          v.id,
          CASE
            WHEN v.p11d IS NULL OR v.p11d = 0 OR vp.monthly_rental IS NULL THEN NULL
            ELSE (vp.monthly_rental * COALESCE(vp.term, 36)::numeric / NULLIF(v.p11d, 0) * 100)
          END as cost_ratio
        FROM vehicles v
        INNER JOIN vehicle_pricing vp ON v.id = vp.vehicle_id
        ${sql.raw(whereClause)}
        ORDER BY v.id, vp.monthly_rental ASC
      ),
      scored_prices AS (
        SELECT *,
          CASE
            WHEN cost_ratio IS NULL THEN 0
            WHEN cost_ratio > 200 THEN 0
            WHEN cost_ratio <= 30 THEN 100
            WHEN cost_ratio <= 40 THEN 90
            WHEN cost_ratio <= 50 THEN 80
            WHEN cost_ratio <= 60 THEN 70
            WHEN cost_ratio <= 70 THEN 60
            WHEN cost_ratio <= 80 THEN 50
            WHEN cost_ratio <= 90 THEN 40
            WHEN cost_ratio <= 100 THEN 30
            ELSE 20
          END as score
        FROM best_prices
      )
      SELECT COUNT(*) as total
      FROM scored_prices
      ${minScore ? sql`WHERE score >= ${parseInt(minScore)}` : sql``}
    `;

    const countResult = await db.execute(countQuery);
    const total = Number(countResult.rows[0]?.total || 0);

    // Get unique manufacturers and fuel types for filters
    const manufacturersResult = await db.execute(sql`
      SELECT DISTINCT manufacturer FROM vehicles WHERE manufacturer IS NOT NULL ORDER BY manufacturer
    `);

    const fuelTypesResult = await db.execute(sql`
      SELECT DISTINCT fuel_type FROM vehicles WHERE fuel_type IS NOT NULL ORDER BY fuel_type
    `);

    return NextResponse.json({
      deals: deals.rows,
      total,
      manufacturers: manufacturersResult.rows.map(r => r.manufacturer),
      fuelTypes: fuelTypesResult.rows.map(r => r.fuel_type),
    });

  } catch (error) {
    console.error("Error fetching best deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch best deals" },
      { status: 500 }
    );
  }
}
