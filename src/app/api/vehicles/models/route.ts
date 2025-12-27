import { NextRequest, NextResponse } from "next/server";
import { db, vehicles } from "@/lib/db";
import { ilike, asc, and, sql } from "drizzle-orm";

/**
 * GET /api/vehicles/models
 * Get unique models for a given manufacturer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const manufacturer = searchParams.get("manufacturer");

    if (!manufacturer) {
      return NextResponse.json({ models: [] });
    }

    // Get distinct models for the manufacturer
    const modelsResult = await db
      .selectDistinct({ model: vehicles.model })
      .from(vehicles)
      .where(
        and(
          ilike(vehicles.manufacturer, `%${manufacturer}%`),
          sql`${vehicles.model} IS NOT NULL AND ${vehicles.model} != ''`
        )
      )
      .orderBy(asc(vehicles.model));

    const models = modelsResult
      .map((m) => m.model)
      .filter((m): m is string => m !== null && m !== "");

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models", models: [] },
      { status: 500 }
    );
  }
}
