import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles, providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and, sql, inArray, notInArray } from "drizzle-orm";

export interface RateRequestVehicle {
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  bodyType: string | null;
  p11dGbp: number;
  co2Gkm: number | null;
  currentProviders: string[];
  missingProviders: string[];
  bestCurrentPriceGbp: number | null;
}

export interface RateRequestExport {
  vehicles: RateRequestVehicle[];
  summary: {
    totalVehicles: number;
    byManufacturer: Record<string, number>;
    byFuelType: Record<string, number>;
    avgP11d: number;
  };
  metadata: {
    generatedAt: string;
    targetProvider: string;
    filters: {
      manufacturer?: string;
      fuelType?: string;
      minP11d?: number;
      maxP11d?: number;
    };
  };
}

const ALL_PROVIDERS = ["lex", "ogilvie", "venus", "drivalia"];

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/funders/rate-request
 *
 * Generate a rate request export for a specific funder.
 * Returns vehicles they don't currently cover.
 *
 * Query params:
 * - provider: target provider code (required)
 * - manufacturer: filter by manufacturer
 * - fuelType: filter by fuel type
 * - minP11d: minimum P11D value in GBP
 * - maxP11d: maximum P11D value in GBP
 * - limit: max vehicles to return (default 100)
 * - format: "json" (default) or "csv"
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetProvider = searchParams.get("provider");
    const manufacturer = searchParams.get("manufacturer");
    const fuelType = searchParams.get("fuelType");
    const minP11d = searchParams.get("minP11d") ? parseInt(searchParams.get("minP11d")!) * 100 : null;
    const maxP11d = searchParams.get("maxP11d") ? parseInt(searchParams.get("maxP11d")!) * 100 : null;
    const limit = parseInt(searchParams.get("limit") || "100");
    const format = searchParams.get("format") || "json";

    if (!targetProvider || !ALL_PROVIDERS.includes(targetProvider)) {
      return NextResponse.json(
        { error: "Valid provider code required (lex, ogilvie, venus, drivalia)" },
        { status: 400 }
      );
    }

    // Get CAP codes that the target provider already covers
    const coveredCapCodes = await db
      .select({ capCode: providerRates.capCode })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(providerRates.providerCode, targetProvider),
          eq(ratebookImports.isLatest, true)
        )
      )
      .groupBy(providerRates.capCode);

    const coveredSet = new Set(coveredCapCodes.map((r) => r.capCode).filter(Boolean));

    // Build vehicle query conditions
    const vehicleConditions = [];
    if (manufacturer) {
      vehicleConditions.push(eq(vehicles.manufacturer, manufacturer));
    }
    if (fuelType) {
      vehicleConditions.push(eq(vehicles.fuelType, fuelType));
    }
    if (minP11d) {
      vehicleConditions.push(sql`${vehicles.p11d} >= ${minP11d}`);
    }
    if (maxP11d) {
      vehicleConditions.push(sql`${vehicles.p11d} <= ${maxP11d}`);
    }

    // Get vehicles not covered by target provider
    const vehicleQuery = await db
      .select({
        capCode: vehicles.capCode,
        manufacturer: vehicles.manufacturer,
        model: vehicles.model,
        variant: vehicles.variant,
        fuelType: vehicles.fuelType,
        bodyType: vehicles.bodyStyle,
        p11d: vehicles.p11d,
        co2: vehicles.co2,
      })
      .from(vehicles)
      .where(vehicleConditions.length > 0 ? and(...vehicleConditions) : undefined)
      .limit(limit * 2); // Get more than needed to filter

    // Filter to only uncovered vehicles
    const uncoveredVehicles = vehicleQuery.filter(
      (v) => v.capCode && !coveredSet.has(v.capCode)
    );

    // Get current coverage info for these vehicles
    const uncoveredCapCodes = uncoveredVehicles
      .map((v) => v.capCode)
      .filter((c): c is string => c !== null);

    let coverageMap = new Map<string, { providers: string[]; bestPrice: number | null }>();

    if (uncoveredCapCodes.length > 0) {
      const coverageData = await db
        .select({
          capCode: providerRates.capCode,
          providerCode: providerRates.providerCode,
          minPrice: sql<number>`min(${providerRates.totalRental})::int`,
        })
        .from(providerRates)
        .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
        .where(
          and(
            inArray(providerRates.capCode, uncoveredCapCodes),
            eq(ratebookImports.isLatest, true)
          )
        )
        .groupBy(providerRates.capCode, providerRates.providerCode);

      // Build coverage map
      for (const row of coverageData) {
        if (!row.capCode) continue;

        if (!coverageMap.has(row.capCode)) {
          coverageMap.set(row.capCode, { providers: [], bestPrice: null });
        }

        const entry = coverageMap.get(row.capCode)!;
        entry.providers.push(row.providerCode);

        if (entry.bestPrice === null || row.minPrice < entry.bestPrice) {
          entry.bestPrice = row.minPrice;
        }
      }
    }

    // Build response vehicles
    const requestVehicles: RateRequestVehicle[] = uncoveredVehicles
      .slice(0, limit)
      .map((v) => {
        const coverage = coverageMap.get(v.capCode!) || { providers: [], bestPrice: null };
        const missingProviders = ALL_PROVIDERS.filter(
          (p) => p !== targetProvider && !coverage.providers.includes(p)
        );

        return {
          capCode: v.capCode!,
          manufacturer: v.manufacturer,
          model: v.model,
          variant: v.variant,
          fuelType: v.fuelType,
          bodyType: v.bodyType,
          p11dGbp: Math.round((v.p11d || 0) / 100),
          co2Gkm: v.co2,
          currentProviders: coverage.providers,
          missingProviders: [targetProvider, ...missingProviders],
          bestCurrentPriceGbp: coverage.bestPrice
            ? Math.round(coverage.bestPrice / 100)
            : null,
        };
      });

    // Calculate summary stats
    const byManufacturer: Record<string, number> = {};
    const byFuelType: Record<string, number> = {};
    let totalP11d = 0;

    for (const v of requestVehicles) {
      byManufacturer[v.manufacturer] = (byManufacturer[v.manufacturer] || 0) + 1;
      if (v.fuelType) {
        byFuelType[v.fuelType] = (byFuelType[v.fuelType] || 0) + 1;
      }
      totalP11d += v.p11dGbp;
    }

    const exportData: RateRequestExport = {
      vehicles: requestVehicles,
      summary: {
        totalVehicles: requestVehicles.length,
        byManufacturer,
        byFuelType,
        avgP11d: requestVehicles.length > 0
          ? Math.round(totalP11d / requestVehicles.length)
          : 0,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        targetProvider: PROVIDER_NAMES[targetProvider] || targetProvider,
        filters: {
          ...(manufacturer && { manufacturer }),
          ...(fuelType && { fuelType }),
          ...(minP11d && { minP11d: minP11d / 100 }),
          ...(maxP11d && { maxP11d: maxP11d / 100 }),
        },
      },
    };

    // Return CSV if requested
    if (format === "csv") {
      const csvRows = [
        ["CAP Code", "Manufacturer", "Model", "Variant", "Fuel Type", "Body Type", "P11D (£)", "CO2 (g/km)", "Current Providers", "Best Current Price (£)"],
        ...requestVehicles.map((v) => [
          v.capCode,
          v.manufacturer,
          v.model,
          v.variant || "",
          v.fuelType || "",
          v.bodyType || "",
          v.p11dGbp.toString(),
          v.co2Gkm?.toString() || "",
          v.currentProviders.join("; "),
          v.bestCurrentPriceGbp?.toString() || "",
        ]),
      ];

      const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="rate-request-${targetProvider}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Error generating rate request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate request" },
      { status: 500 }
    );
  }
}
