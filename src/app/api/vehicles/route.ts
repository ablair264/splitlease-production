import { NextRequest, NextResponse } from "next/server";
import { db, vehicles, vehiclePricing } from "@/lib/db";
import { eq, desc, asc, sql, and, ilike, or, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const offset = (page - 1) * limit;

    // Filters
    const search = searchParams.get("search");
    const manufacturer = searchParams.get("manufacturer");
    const fuelType = searchParams.get("fuelType");
    const bodyType = searchParams.get("bodyType");
    const transmission = searchParams.get("transmission");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Sort
    const sortBy = searchParams.get("sortBy") || "price-asc";

    // Build base query to get vehicles with their lowest price
    const vehiclesWithPricing = await db
      .select({
        id: vehicles.id,
        capCode: vehicles.capCode,
        manufacturer: vehicles.manufacturer,
        model: vehicles.model,
        variant: vehicles.variant,
        modelYear: vehicles.modelYear,
        p11d: vehicles.p11d,
        otr: vehicles.otr,
        engineSize: vehicles.engineSize,
        transmission: vehicles.transmission,
        doors: vehicles.doors,
        fuelType: vehicles.fuelType,
        co2: vehicles.co2,
        mpg: vehicles.mpg,
        bodyStyle: vehicles.bodyStyle,
        insuranceGroup: vehicles.insuranceGroup,
        euroClass: vehicles.euroClass,
        imageFolder: vehicles.imageFolder,
        createdAt: vehicles.createdAt,
        // Get the minimum monthly rental for 36m/10k miles
        minMonthlyRental: sql<number>`MIN(CASE WHEN ${vehiclePricing.term} = 36 AND ${vehiclePricing.annualMileage} = 10000 THEN ${vehiclePricing.monthlyRental} END)`.as("min_monthly_rental"),
      })
      .from(vehicles)
      .leftJoin(vehiclePricing, eq(vehicles.id, vehiclePricing.vehicleId))
      .where(
        and(
          // Search filter
          search ? or(
            ilike(vehicles.manufacturer, `%${search}%`),
            ilike(vehicles.model, `%${search}%`),
            ilike(vehicles.variant, `%${search}%`)
          ) : undefined,
          // Manufacturer filter
          manufacturer ? ilike(vehicles.manufacturer, `%${manufacturer}%`) : undefined,
          // Fuel type filter
          fuelType ? ilike(vehicles.fuelType, `%${fuelType}%`) : undefined,
          // Body type filter
          bodyType ? ilike(vehicles.bodyStyle, `%${bodyType}%`) : undefined,
          // Transmission filter
          transmission ? ilike(vehicles.transmission, `%${transmission}%`) : undefined
        )
      )
      .groupBy(vehicles.id)
      .having(
        and(
          // Only include vehicles with pricing
          sql`MIN(${vehiclePricing.monthlyRental}) IS NOT NULL`,
          // Price range filter (convert pence to pounds)
          minPrice ? gte(sql`MIN(${vehiclePricing.monthlyRental})`, parseInt(minPrice) * 100) : undefined,
          maxPrice ? lte(sql`MIN(${vehiclePricing.monthlyRental})`, parseInt(maxPrice) * 100) : undefined
        )
      )
      .orderBy(
        sortBy === "price-desc"
          ? desc(sql`MIN(${vehiclePricing.monthlyRental})`)
          : sortBy === "name"
          ? asc(vehicles.manufacturer)
          : asc(sql`MIN(${vehiclePricing.monthlyRental})`)
      )
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${vehicles.id})` })
      .from(vehicles)
      .leftJoin(vehiclePricing, eq(vehicles.id, vehiclePricing.vehicleId))
      .where(
        and(
          search ? or(
            ilike(vehicles.manufacturer, `%${search}%`),
            ilike(vehicles.model, `%${search}%`),
            ilike(vehicles.variant, `%${search}%`)
          ) : undefined,
          manufacturer ? ilike(vehicles.manufacturer, `%${manufacturer}%`) : undefined,
          fuelType ? ilike(vehicles.fuelType, `%${fuelType}%`) : undefined,
          bodyType ? ilike(vehicles.bodyStyle, `%${bodyType}%`) : undefined,
          transmission ? ilike(vehicles.transmission, `%${transmission}%`) : undefined
        )
      );

    const totalCount = countResult[0]?.count || 0;

    // Transform data for frontend
    const transformedVehicles = vehiclesWithPricing.map((v) => ({
      id: v.id,
      manufacturer: v.manufacturer,
      model: v.model,
      derivative: v.variant || "",
      fuelType: v.fuelType || "Unknown",
      bodyType: v.bodyStyle || "Unknown",
      transmission: v.transmission || "Unknown",
      engineSize: v.engineSize ? `${v.engineSize}cc` : undefined,
      co2: v.co2 || undefined,
      mpg: v.mpg ? parseFloat(v.mpg) : undefined,
      doors: v.doors || undefined,
      imageFolder: v.imageFolder || undefined,
      isNew: v.modelYear === "26" || v.modelYear === "25",
      isSpecialOffer: false, // Could be based on discount %
      quickDelivery: false, // Could be based on stock availability
      // Convert from pence to pounds
      baseMonthlyPrice: v.minMonthlyRental ? Math.round(v.minMonthlyRental / 100) : 0,
    }));

    return NextResponse.json({
      vehicles: transformedVehicles,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}
