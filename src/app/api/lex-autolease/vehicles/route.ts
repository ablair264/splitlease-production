import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hasLexCodes = searchParams.get("hasLexCodes") === "true";
    const make = searchParams.get("make");

    let whereClause = "WHERE 1=1";

    if (hasLexCodes) {
      whereClause += " AND lex_make_code IS NOT NULL AND lex_model_code IS NOT NULL AND lex_variant_code IS NOT NULL";
    }

    if (make) {
      whereClause += ` AND manufacturer = '${make.replace(/'/g, "''")}'`;
    }

    const vehicles = await sql(`
      SELECT
        id, cap_code, manufacturer, model, variant, model_year,
        fuel_type, transmission, body_style, co2,
        lex_make_code, lex_model_code, lex_variant_code
      FROM vehicles
      ${whereClause}
      ORDER BY manufacturer, model, variant
      LIMIT 500
    `);

    // Get unique manufacturers
    const makesResult = await sql`
      SELECT DISTINCT manufacturer FROM vehicles
      WHERE lex_make_code IS NOT NULL
      ORDER BY manufacturer
    `;
    const makes = makesResult.map(r => r.manufacturer);

    return NextResponse.json({ vehicles, makes });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, lexMakeCode, lexModelCode, lexVariantCode } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE vehicles
      SET
        lex_make_code = ${lexMakeCode || null},
        lex_model_code = ${lexModelCode || null},
        lex_variant_code = ${lexVariantCode || null}
      WHERE id = ${vehicleId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}
