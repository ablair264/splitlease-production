import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getContractTypesForFilters } from "@/lib/rates/types";
import type { ContractTab } from "@/lib/rates/types";

/**
 * GET /api/admin/rates/filters
 * Get available filter options for the rates browser
 *
 * Query params:
 * - tab: contract-hire | personal-contract-hire | salary-sacrifice
 * - withMaintenance: true/false
 * - manufacturers: comma-separated (for cascading model filter)
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
    const selectedManufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];

    // Get contract types based on tab and maintenance toggle
    const contractTypes = getContractTypesForFilters(tab, withMaintenance);

    // Base condition for latest imports and contract types
    const baseConditions = [
      sql`${providerRates.importId} IN (SELECT id FROM ratebook_imports WHERE is_latest = true)`,
    ];

    if (contractTypes.length > 0) {
      baseConditions.push(inArray(providerRates.contractType, contractTypes));
    }

    // Get unique manufacturers
    const manufacturers = await db
      .selectDistinct({ manufacturer: providerRates.manufacturer })
      .from(providerRates)
      .where(and(...baseConditions))
      .orderBy(providerRates.manufacturer);

    // Get models - filtered by selected manufacturers if any
    const modelConditions = [...baseConditions];
    if (selectedManufacturers.length > 0) {
      modelConditions.push(
        inArray(providerRates.manufacturer, selectedManufacturers.map((m) => m.toUpperCase()))
      );
    }

    const models = await db
      .selectDistinct({
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
      })
      .from(providerRates)
      .where(and(...modelConditions))
      .orderBy(providerRates.manufacturer, providerRates.model);

    // Get unique fuel types
    const fuelTypes = await db
      .selectDistinct({ fuelType: providerRates.fuelType })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.fuelType} IS NOT NULL`))
      .orderBy(providerRates.fuelType);

    // Get unique body styles
    const bodyTypes = await db
      .selectDistinct({ bodyStyle: providerRates.bodyStyle })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.bodyStyle} IS NOT NULL`))
      .orderBy(providerRates.bodyStyle);

    // Get unique terms
    const terms = await db
      .selectDistinct({ term: providerRates.term })
      .from(providerRates)
      .where(and(...baseConditions))
      .orderBy(providerRates.term);

    // Get unique mileages
    const mileages = await db
      .selectDistinct({ annualMileage: providerRates.annualMileage })
      .from(providerRates)
      .where(and(...baseConditions))
      .orderBy(providerRates.annualMileage);

    // Get price range
    const [priceRange] = await db
      .select({
        min: sql<number>`MIN(${providerRates.totalRental})`,
        max: sql<number>`MAX(${providerRates.totalRental})`,
      })
      .from(providerRates)
      .where(and(...baseConditions));

    // Get CO2 range
    const [co2Range] = await db
      .select({
        min: sql<number>`MIN(${providerRates.co2Gkm})`,
        max: sql<number>`MAX(${providerRates.co2Gkm})`,
      })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.co2Gkm} IS NOT NULL`));

    // Get P11D range
    const [p11dRange] = await db
      .select({
        min: sql<number>`MIN(${providerRates.p11d})`,
        max: sql<number>`MAX(${providerRates.p11d})`,
      })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.p11d} IS NOT NULL`));

    // Get max EV range
    const [evRangeMax] = await db
      .select({
        max: sql<number>`MAX(${providerRates.wltpEvRange})`,
      })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.wltpEvRange} IS NOT NULL`));

    // Get unique insurance groups
    const insuranceGroups = await db
      .selectDistinct({ insuranceGroup: providerRates.insuranceGroup })
      .from(providerRates)
      .where(and(...baseConditions, sql`${providerRates.insuranceGroup} IS NOT NULL`))
      .orderBy(providerRates.insuranceGroup);

    return NextResponse.json({
      options: {
        manufacturers: manufacturers.map((m) => m.manufacturer).filter(Boolean),
        models: models
          .filter((m) => m.model)
          .map((m) => ({
            manufacturer: m.manufacturer,
            model: m.model,
          })),
        fuelTypes: fuelTypes.map((f) => f.fuelType).filter(Boolean) as string[],
        bodyTypes: bodyTypes.map((b) => b.bodyStyle).filter(Boolean) as string[],
        terms: terms.map((t) => t.term).filter(Boolean).sort((a, b) => a - b) as number[],
        mileages: mileages.map((m) => m.annualMileage).filter(Boolean).sort((a, b) => a - b) as number[],
        priceRange: {
          min: priceRange?.min ? priceRange.min / 100 : 0,
          max: priceRange?.max ? priceRange.max / 100 : 5000,
        },
        insuranceGroups: insuranceGroups.map((i) => i.insuranceGroup).filter(Boolean) as string[],
        co2Range: {
          min: co2Range?.min || 0,
          max: co2Range?.max || 300,
        },
        evRangeMax: evRangeMax?.max || 500,
        p11dRange: {
          min: p11dRange?.min ? p11dRange.min / 100 : 0,
          max: p11dRange?.max ? p11dRange.max / 100 : 200000,
        },
      },
      context: {
        tab,
        withMaintenance,
        contractTypes,
      },
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch filter options" },
      { status: 500 }
    );
  }
}
