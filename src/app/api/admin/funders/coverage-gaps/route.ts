import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates, ratebookImports, vehicles } from "@/lib/db/schema";
import { eq, and, sql, inArray, not } from "drizzle-orm";

export interface CoverageGap {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  p11dGbp: number;
  presentProviders: string[];
  missingProviders: string[];
  coveragePercent: number;
  bestAvailablePrice: number | null;
  potentialImprovement: string;
}

export interface ProviderCoverage {
  code: string;
  name: string;
  totalVehicles: number;
  uniqueCapCodes: number;
  avgPrice: number;
  lastImport: string | null;
}

export interface CoverageGapsResponse {
  gaps: CoverageGap[];
  providerCoverage: ProviderCoverage[];
  summary: {
    totalVehicles: number;
    fullCoverage: number;
    partialCoverage: number;
    singleProvider: number;
    avgCoveragePercent: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
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
 * GET /api/admin/funders/coverage-gaps
 *
 * Returns vehicles with incomplete funder coverage.
 *
 * Query params:
 * - page: page number (default 1)
 * - pageSize: items per page (default 50)
 * - missingProvider: filter to show only vehicles missing this provider
 * - manufacturer: filter by manufacturer
 * - minGap: minimum missing providers (1-3, default 1)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const missingProvider = searchParams.get("missingProvider");
    const manufacturerFilter = searchParams.get("manufacturer");
    const minGap = parseInt(searchParams.get("minGap") || "1");

    // Get provider coverage stats per CAP code
    const coverageData = await db
      .select({
        capCode: providerRates.capCode,
        vehicleId: providerRates.vehicleId,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        providers: sql<string[]>`array_agg(distinct ${providerRates.providerCode})`,
        providerCount: sql<number>`count(distinct ${providerRates.providerCode})::int`,
        minPrice: sql<number>`min(${providerRates.totalRental})::int`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true))
      .groupBy(
        providerRates.capCode,
        providerRates.vehicleId,
        providerRates.manufacturer,
        providerRates.model,
        providerRates.variant
      );

    // Get vehicle details for p11d and fuel type
    const vehicleIds = coverageData
      .map((c) => c.vehicleId)
      .filter((id): id is string => id !== null);

    let vehicleDetails = new Map<string, { p11d: number | null; fuelType: string | null }>();

    if (vehicleIds.length > 0) {
      const vehicleData = await db
        .select({
          id: vehicles.id,
          p11d: vehicles.p11d,
          fuelType: vehicles.fuelType,
        })
        .from(vehicles)
        .where(inArray(vehicles.id, vehicleIds));

      vehicleDetails = new Map(
        vehicleData.map((v) => [v.id, { p11d: v.p11d, fuelType: v.fuelType }])
      );
    }

    // Identify gaps
    const allGaps: CoverageGap[] = coverageData
      .map((c) => {
        const presentProviders = c.providers || [];
        const missingProviders = ALL_PROVIDERS.filter(
          (p) => !presentProviders.includes(p)
        );

        // Skip if no gaps
        if (missingProviders.length === 0) return null;

        // Skip if below minimum gap threshold
        if (missingProviders.length < minGap) return null;

        // Apply filters
        if (manufacturerFilter && c.manufacturer !== manufacturerFilter) return null;
        if (missingProvider && !missingProviders.includes(missingProvider)) return null;

        const vehicleInfo = c.vehicleId ? vehicleDetails.get(c.vehicleId) : null;
        const coveragePercent = Math.round(
          (presentProviders.length / ALL_PROVIDERS.length) * 100
        );

        // Suggest potential improvement
        let potentialImprovement = "";
        if (missingProviders.length === 1) {
          potentialImprovement = `Add ${PROVIDER_NAMES[missingProviders[0]]} for full coverage`;
        } else if (missingProviders.length === 2) {
          potentialImprovement = `Missing ${missingProviders.map((p) => PROVIDER_NAMES[p]).join(" and ")}`;
        } else {
          potentialImprovement = `Only covered by ${presentProviders.map((p) => PROVIDER_NAMES[p] || p).join(", ")}`;
        }

        return {
          vehicleId: c.vehicleId || "",
          capCode: c.capCode,
          manufacturer: c.manufacturer,
          model: c.model,
          variant: c.variant,
          fuelType: vehicleInfo?.fuelType || null,
          p11dGbp: vehicleInfo?.p11d ? Math.round(vehicleInfo.p11d / 100) : 0,
          presentProviders,
          missingProviders,
          coveragePercent,
          bestAvailablePrice: c.minPrice ? Math.round(c.minPrice / 100) : null,
          potentialImprovement,
        };
      })
      .filter((g): g is CoverageGap => g !== null);

    // Sort by coverage gap (fewer providers first)
    allGaps.sort((a, b) => a.coveragePercent - b.coveragePercent);

    // Pagination
    const total = allGaps.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedGaps = allGaps.slice((page - 1) * pageSize, page * pageSize);

    // Calculate provider coverage stats
    const providerStats = await db
      .select({
        providerCode: providerRates.providerCode,
        totalRates: sql<number>`count(*)::int`,
        uniqueCapCodes: sql<number>`count(distinct ${providerRates.capCode})::int`,
        avgPrice: sql<number>`avg(${providerRates.totalRental})::int`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true))
      .groupBy(providerRates.providerCode);

    // Get last import dates
    const lastImports = await db
      .select({
        providerCode: ratebookImports.providerCode,
        lastImport: sql<Date>`max(${ratebookImports.createdAt})`,
      })
      .from(ratebookImports)
      .where(eq(ratebookImports.isLatest, true))
      .groupBy(ratebookImports.providerCode);

    const lastImportMap = new Map(
      lastImports.map((i) => [i.providerCode, i.lastImport])
    );

    const providerCoverage: ProviderCoverage[] = ALL_PROVIDERS.map((code) => {
      const stats = providerStats.find((s) => s.providerCode === code);
      const lastImport = lastImportMap.get(code);
      return {
        code,
        name: PROVIDER_NAMES[code],
        totalVehicles: stats?.totalRates || 0,
        uniqueCapCodes: stats?.uniqueCapCodes || 0,
        avgPrice: stats?.avgPrice ? Math.round(stats.avgPrice / 100) : 0,
        lastImport: lastImport?.toISOString() || null,
      };
    });

    // Calculate summary stats
    const fullCoverage = coverageData.filter(
      (c) => (c.providers?.length || 0) >= ALL_PROVIDERS.length
    ).length;
    const singleProvider = coverageData.filter(
      (c) => (c.providers?.length || 0) === 1
    ).length;
    const partialCoverage = coverageData.length - fullCoverage - singleProvider;
    const avgCoveragePercent = coverageData.length > 0
      ? Math.round(
          (coverageData.reduce((sum, c) => sum + (c.providerCount || 0), 0) /
            coverageData.length /
            ALL_PROVIDERS.length) *
            100
        )
      : 0;

    const response: CoverageGapsResponse = {
      gaps: paginatedGaps,
      providerCoverage,
      summary: {
        totalVehicles: coverageData.length,
        fullCoverage,
        partialCoverage,
        singleProvider,
        avgCoveragePercent,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching coverage gaps:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch coverage gaps" },
      { status: 500 }
    );
  }
}
