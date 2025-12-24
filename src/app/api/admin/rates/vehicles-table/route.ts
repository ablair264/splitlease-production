import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports, vehicleStatus } from "@/lib/db/schema";
import { sql, eq, and, isNotNull, asc, or, ilike, inArray, gte, lte } from "drizzle-orm";

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
  ald: "ALD Automotive",
};

// Calculate integrity based on rate data age
function calculateIntegrityDays(ratebookDate: Date | string | null): number {
  if (!ratebookDate) return 999;
  // Handle both Date objects and string dates from SQL
  const date = typeof ratebookDate === 'string' ? new Date(ratebookDate) : ratebookDate;
  if (isNaN(date.getTime())) return 999;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const offset = (page - 1) * pageSize;

    // Filters
    const search = searchParams.get("search") || "";
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean) || [];
    const priceMin = searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) * 100 : null;
    const priceMax = searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) * 100 : null;
    const scoreMin = parseInt(searchParams.get("scoreMin") || "0");
    const scoreMax = parseInt(searchParams.get("scoreMax") || "100");
    const ageMax = searchParams.get("ageMax") ? parseInt(searchParams.get("ageMax")!) : null;
    const specialOfferOnly = searchParams.get("specialOffer") === "true";
    const enabledOnly = searchParams.get("enabledOnly") !== "false"; // Default to enabled only

    // Sort
    const sortBy = searchParams.get("sortBy") || "bestScore";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build WHERE conditions for latest rates
    const conditions = [
      eq(ratebookImports.isLatest, true),
      isNotNull(providerRates.vehicleId),
    ];

    if (manufacturers.length > 0) {
      conditions.push(inArray(providerRates.manufacturer, manufacturers));
    }

    if (fuelTypes.length > 0) {
      conditions.push(inArray(providerRates.fuelType, fuelTypes));
    }

    if (priceMin !== null) {
      conditions.push(gte(providerRates.totalRental, priceMin));
    }

    if (priceMax !== null) {
      conditions.push(lte(providerRates.totalRental, priceMax));
    }

    if (search) {
      const searchCondition = or(
        ilike(providerRates.manufacturer, `%${search}%`),
        ilike(providerRates.model, `%${search}%`),
        ilike(providerRates.variant, `%${search}%`),
        ilike(providerRates.capCode, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get vehicle aggregates with best prices, stored scores, and rate age
    // NOTE: Only group by vehicleId - manufacturer/model may differ across providers
    const vehicleAggregates = await db
      .select({
        vehicleId: providerRates.vehicleId,
        capCode: sql<string>`MIN(${providerRates.capCode})`.as("capCode"),
        manufacturer: sql<string>`MIN(${providerRates.manufacturer})`.as("manufacturer"),
        model: sql<string>`MIN(${providerRates.model})`.as("model"),
        variant: sql<string>`MIN(${providerRates.variant})`.as("variant"),
        fuelType: sql<string>`MIN(${providerRates.fuelType})`.as("fuelType"),
        p11d: sql<number>`MAX(${providerRates.p11d})`.as("p11d"),
        bestPrice: sql<number>`MIN(${providerRates.totalRental})`.as("bestPrice"),
        bestScore: sql<number>`MAX(${providerRates.score})`.as("bestScore"),
        bestProviderCode: sql<string>`(
          SELECT pr2.provider_code
          FROM provider_rates pr2
          INNER JOIN ratebook_imports ri2 ON pr2.import_id = ri2.id
          WHERE pr2.vehicle_id = ${providerRates.vehicleId}
          AND ri2.is_latest = true
          ORDER BY pr2.total_rental ASC
          LIMIT 1
        )`.as("bestProviderCode"),
        providerCount: sql<number>`COUNT(DISTINCT ${providerRates.providerCode})`.as("providerCount"),
        providers: sql<string>`STRING_AGG(DISTINCT ${providerRates.providerCode}, ',')`.as("providers"),
        latestRatebookDate: sql<Date>`MAX(COALESCE(${ratebookImports.ratebookDate}, ${ratebookImports.createdAt}))`.as("latestRatebookDate"),
        rateCount: sql<number>`COUNT(*)`.as("rateCount"),
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(and(...conditions))
      .groupBy(providerRates.vehicleId);

    // Get vehicle status (special offer, enabled) for all vehicles
    const vehicleIds = vehicleAggregates
      .map((v) => v.vehicleId)
      .filter((id): id is string => id !== null);

    let statusMap = new Map<string, { isSpecialOffer: boolean; isEnabled: boolean }>();

    if (vehicleIds.length > 0) {
      const statuses = await db
        .select({
          vehicleId: vehicleStatus.vehicleId,
          isSpecialOffer: vehicleStatus.isSpecialOffer,
          isEnabled: vehicleStatus.isEnabled,
        })
        .from(vehicleStatus)
        .where(inArray(vehicleStatus.vehicleId, vehicleIds));

      statuses.forEach((s) => {
        statusMap.set(s.vehicleId, {
          isSpecialOffer: s.isSpecialOffer || false,
          isEnabled: s.isEnabled !== false,
        });
      });
    }

    // Filter and format vehicles using stored scores
    const processedVehicles = vehicleAggregates
      .map((v) => {
        const p11dValue = v.p11d ? Number(v.p11d) : null;
        const bestPrice = Number(v.bestPrice);
        // Use stored score from database
        const score = v.bestScore ? Number(v.bestScore) : 50;
        const integrityDays = calculateIntegrityDays(v.latestRatebookDate);

        const status = statusMap.get(v.vehicleId || "") || {
          isSpecialOffer: false,
          isEnabled: true,
        };

        // Apply filters
        if (score < scoreMin || score > scoreMax) return null;
        if (ageMax !== null && integrityDays > ageMax) return null;
        if (specialOfferOnly && !status.isSpecialOffer) return null;
        if (enabledOnly && !status.isEnabled) return null;

        // Generate logo URL
        const logoSlug = v.manufacturer.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const logoUrl = `/logos/thumb/${logoSlug}.png`;

        return {
          id: v.vehicleId,
          capCode: v.capCode,
          manufacturer: v.manufacturer,
          model: v.model,
          variant: v.variant,
          fuelType: v.fuelType,
          p11dGbp: p11dValue ? Math.round(p11dValue / 100) : 0,
          bestFunder: {
            code: v.bestProviderCode,
            name: PROVIDER_NAMES[v.bestProviderCode] || v.bestProviderCode?.toUpperCase() || "Unknown",
            priceGbp: Math.round(bestPrice / 100),
          },
          providerCount: Number(v.providerCount),
          providers: v.providers?.split(",") || [],
          latestRateDate: v.latestRatebookDate
            ? (typeof v.latestRatebookDate === 'string'
                ? v.latestRatebookDate
                : v.latestRatebookDate.toISOString())
            : null,
          integrityDays,
          bestScore: score,
          isSpecialOffer: status.isSpecialOffer,
          isEnabled: status.isEnabled,
          logoUrl,
          rateCount: Number(v.rateCount),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    // Sort
    const sortedVehicles = [...processedVehicles].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "bestScore":
          comparison = a.bestScore - b.bestScore;
          break;
        case "price":
          comparison = a.bestFunder.priceGbp - b.bestFunder.priceGbp;
          break;
        case "p11d":
          comparison = a.p11dGbp - b.p11dGbp;
          break;
        case "manufacturer":
          comparison = a.manufacturer.localeCompare(b.manufacturer);
          break;
        case "model":
          comparison = a.model.localeCompare(b.model);
          break;
        case "providerCount":
          comparison = a.providerCount - b.providerCount;
          break;
        case "integrityDays":
          comparison = a.integrityDays - b.integrityDays;
          break;
        case "isSpecialOffer":
        case "star":
          // Sort special offers first when descending
          comparison = (a.isSpecialOffer ? 1 : 0) - (b.isSpecialOffer ? 1 : 0);
          break;
        default:
          comparison = a.bestScore - b.bestScore;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Paginate
    const total = sortedVehicles.length;
    const paginatedVehicles = sortedVehicles.slice(offset, offset + pageSize);

    // Get filter options
    const filterOptions = await getFilterOptions();

    return NextResponse.json({
      vehicles: paginatedVehicles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
      filterOptions,
    });
  } catch (error) {
    console.error("Error fetching vehicle table data:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle table data" },
      { status: 500 }
    );
  }
}

async function getFilterOptions() {
  try {
    // Get distinct manufacturers
    const manufacturersResult = await db
      .selectDistinct({ manufacturer: providerRates.manufacturer })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true))
      .orderBy(asc(providerRates.manufacturer));

    // Get distinct fuel types
    const fuelTypesResult = await db
      .selectDistinct({ fuelType: providerRates.fuelType })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(and(eq(ratebookImports.isLatest, true), isNotNull(providerRates.fuelType)))
      .orderBy(asc(providerRates.fuelType));

    // Get distinct providers
    const providersResult = await db
      .selectDistinct({ providerCode: providerRates.providerCode })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true))
      .orderBy(asc(providerRates.providerCode));

    // Get price range
    const priceRangeResult = await db
      .select({
        minPrice: sql<number>`MIN(${providerRates.totalRental})`,
        maxPrice: sql<number>`MAX(${providerRates.totalRental})`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(eq(ratebookImports.isLatest, true));

    return {
      manufacturers: manufacturersResult.map((r) => r.manufacturer),
      fuelTypes: fuelTypesResult.map((r) => r.fuelType).filter(Boolean) as string[],
      providers: providersResult.map((r) => ({
        code: r.providerCode,
        name: PROVIDER_NAMES[r.providerCode] || r.providerCode.toUpperCase(),
      })),
      priceRange: {
        min: priceRangeResult[0]?.minPrice ? Math.round(Number(priceRangeResult[0].minPrice) / 100) : 0,
        max: priceRangeResult[0]?.maxPrice ? Math.round(Number(priceRangeResult[0].maxPrice) / 100) : 10000,
      },
    };
  } catch (error) {
    console.error("Error fetching filter options:", error);
    return {
      manufacturers: [],
      fuelTypes: [],
      providers: [],
      priceRange: { min: 0, max: 10000 },
    };
  }
}
