import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles, providerRates, ratebookImports } from "@/lib/db/schema";
import { sql, eq, and, isNotNull, desc, asc, or, ilike, inArray, gte, lte, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    // Filters
    const contractTypes = searchParams.get("contractTypes")?.split(",").filter(Boolean) || [];
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const models = searchParams.get("models")?.split(",").filter(Boolean) || [];
    const providers = searchParams.get("providers")?.split(",").filter(Boolean) || [];
    const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean) || [];
    const minScore = parseInt(searchParams.get("minScore") || "0");
    const maxScore = parseInt(searchParams.get("maxScore") || "100");
    const search = searchParams.get("search") || "";

    // Sort
    const sortBy = searchParams.get("sortBy") || "score";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build WHERE conditions for latest rates
    const conditions = [
      eq(ratebookImports.isLatest, true),
      isNotNull(providerRates.vehicleId),
    ];

    if (contractTypes.length > 0) {
      conditions.push(inArray(providerRates.contractType, contractTypes));
    }

    if (manufacturers.length > 0) {
      conditions.push(inArray(providerRates.manufacturer, manufacturers));
    }

    if (models.length > 0) {
      conditions.push(inArray(providerRates.model, models));
    }

    if (providers.length > 0) {
      conditions.push(inArray(providerRates.providerCode, providers));
    }

    if (fuelTypes.length > 0) {
      conditions.push(inArray(providerRates.fuelType, fuelTypes));
    }

    if (search) {
      const searchCondition = or(
        ilike(providerRates.manufacturer, `%${search}%`),
        ilike(providerRates.model, `%${search}%`),
        ilike(providerRates.variant, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get vehicle aggregates with best prices
    const vehicleAggregates = await db
      .select({
        vehicleId: providerRates.vehicleId,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: sql<string>`MIN(${providerRates.variant})`.as("variant"),
        capCode: sql<string>`MIN(${providerRates.capCode})`.as("capCode"),
        fuelType: sql<string>`MIN(${providerRates.fuelType})`.as("fuelType"),
        transmission: sql<string>`MIN(${providerRates.transmission})`.as("transmission"),
        co2: sql<number>`MIN(${providerRates.co2Gkm})`.as("co2"),
        p11d: sql<number>`MAX(${providerRates.p11d})`.as("p11d"),
        bestPrice: sql<number>`MIN(${providerRates.totalRental})`.as("bestPrice"),
        providerCount: sql<number>`COUNT(DISTINCT ${providerRates.providerCode})`.as("providerCount"),
        rateCount: sql<number>`COUNT(*)`.as("rateCount"),
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(and(...conditions))
      .groupBy(
        providerRates.vehicleId,
        providerRates.manufacturer,
        providerRates.model
      )
      .orderBy(
        sortBy === "bestPrice"
          ? (sortOrder === "asc" ? asc(sql`MIN(${providerRates.totalRental})`) : desc(sql`MIN(${providerRates.totalRental})`))
          : sortBy === "p11d"
          ? (sortOrder === "asc" ? asc(sql`MAX(${providerRates.p11d})`) : desc(sql`MAX(${providerRates.p11d})`))
          : sortBy === "manufacturer"
          ? (sortOrder === "asc" ? asc(providerRates.manufacturer) : desc(providerRates.manufacturer))
          : // Default: sort by score (calculated as bestPrice/p11d ratio - lower is better)
            sortOrder === "asc"
            ? asc(sql`MIN(${providerRates.totalRental})::float / NULLIF(MAX(${providerRates.p11d})::float, 0)`)
            : desc(sql`MIN(${providerRates.totalRental})::float / NULLIF(MAX(${providerRates.p11d})::float, 0)`)
      )
      .limit(pageSize)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${providerRates.vehicleId})`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    // Get provider rates for each vehicle
    const vehicleIds = vehicleAggregates
      .map((v) => v.vehicleId)
      .filter((id): id is string => id !== null);

    let providerRatesData: Array<{
      vehicleId: string | null;
      providerCode: string;
      contractType: string;
      totalRental: number;
      p11d: number | null;
    }> = [];

    if (vehicleIds.length > 0) {
      providerRatesData = await db
        .select({
          vehicleId: providerRates.vehicleId,
          providerCode: providerRates.providerCode,
          contractType: providerRates.contractType,
          totalRental: providerRates.totalRental,
          p11d: providerRates.p11d,
        })
        .from(providerRates)
        .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
        .where(
          and(
            eq(ratebookImports.isLatest, true),
            inArray(providerRates.vehicleId, vehicleIds)
          )
        );
    }

    // Get vehicle images
    const vehicleDetails = vehicleIds.length > 0
      ? await db
          .select({
            id: vehicles.id,
            imageFolder: vehicles.imageFolder,
          })
          .from(vehicles)
          .where(inArray(vehicles.id, vehicleIds))
      : [];

    const imageMap = new Map(vehicleDetails.map((v) => [v.id, v.imageFolder]));

    // Calculate score and format response
    const calculateScore = (bestPrice: number, p11d: number | null): number => {
      if (!p11d || p11d === 0) return 50;
      const ratio = (bestPrice * 36) / p11d;
      if (ratio < 0.28) return 95;
      if (ratio < 0.32) return 90;
      if (ratio < 0.38) return 80;
      if (ratio < 0.45) return 70;
      if (ratio < 0.55) return 60;
      return 50;
    };

    const providerNames: Record<string, string> = {
      lex: "Lex Autolease",
      ogilvie: "Ogilvie Fleet",
      venus: "Venus",
      drivalia: "Drivalia",
    };

    const formattedVehicles = vehicleAggregates
      .map((v) => {
        const score = calculateScore(Number(v.bestPrice), v.p11d ? Number(v.p11d) : null);

        // Filter by score range
        if (score < minScore || score > maxScore) return null;

        // Get rates for this vehicle
        const vehicleRates = providerRatesData.filter((r) => r.vehicleId === v.vehicleId);

        // Group by provider
        const providerMap = new Map<string, { ch: number | null; pch: number | null; p11d: number | null }>();
        vehicleRates.forEach((rate) => {
          const existing = providerMap.get(rate.providerCode) || { ch: null, pch: null, p11d: rate.p11d };
          if (rate.contractType === "CH" || rate.contractType === "CHNM") {
            existing.ch = Math.min(existing.ch || Infinity, rate.totalRental);
          }
          if (rate.contractType === "PCH" || rate.contractType === "PCHNM") {
            existing.pch = Math.min(existing.pch || Infinity, rate.totalRental);
          }
          existing.p11d = rate.p11d;
          providerMap.set(rate.providerCode, existing);
        });

        // Find best provider
        let bestProvider = "Unknown";
        let lowestPrice = Infinity;
        providerMap.forEach((rates, provider) => {
          const minPrice = Math.min(rates.ch || Infinity, rates.pch || Infinity);
          if (minPrice < lowestPrice) {
            lowestPrice = minPrice;
            bestProvider = provider;
          }
        });

        // Format provider rates for comparison grid
        const providerRatesFormatted = Array.from(providerMap.entries()).map(([provider, rates]) => {
          const minPrice = Math.min(rates.ch || Infinity, rates.pch || Infinity);
          const providerScore = calculateScore(minPrice, rates.p11d ? Number(rates.p11d) : null);
          return {
            provider: providerNames[provider] || provider.toUpperCase(),
            providerCode: provider,
            chPrice: rates.ch !== Infinity && rates.ch !== null ? Math.round(rates.ch / 100) : null,
            pchPrice: rates.pch !== Infinity && rates.pch !== null ? Math.round(rates.pch / 100) : null,
            score: providerScore,
            isBest: provider === bestProvider,
          };
        }).sort((a, b) => {
          const aMin = Math.min(a.chPrice || Infinity, a.pchPrice || Infinity);
          const bMin = Math.min(b.chPrice || Infinity, b.pchPrice || Infinity);
          return aMin - bMin;
        });

        // Get image URL
        const imageFolder = imageMap.get(v.vehicleId || "");
        const imageUrl = imageFolder
          ? `/images/vehicles/${imageFolder}/front_view.webp`
          : null;

        return {
          id: v.vehicleId,
          manufacturer: v.manufacturer,
          model: v.model,
          variant: v.variant,
          capCode: v.capCode,
          fuelType: v.fuelType,
          transmission: v.transmission,
          co2: v.co2 ? Number(v.co2) : undefined,
          p11d: v.p11d ? Math.round(Number(v.p11d) / 100) : 0,
          imageUrl,
          bestPrice: Math.round(Number(v.bestPrice) / 100),
          bestProvider: providerNames[bestProvider] || bestProvider.toUpperCase(),
          providerCount: Number(v.providerCount),
          rateCount: Number(v.rateCount),
          score,
          providerRates: providerRatesFormatted,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    return NextResponse.json({
      vehicles: formattedVehicles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle rates" },
      { status: 500 }
    );
  }
}
