import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates, ratebookImports, vehicles, lexQuotes } from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export type VehicleRate = {
  id: string;
  source: "provider_rates" | "lex_quotes";
  providerCode: string;
  providerName: string;
  contractType: string;
  term: number;
  annualMileage: number;
  paymentPlan: string;
  initialRental: number | null;
  leaseRental: number | null;
  serviceRental: number | null;
  totalRental: number;
  excessMileagePpm: number | null;
  otrp: number | null;
  brokerOtrp: number | null;
  usedFleetDiscount: boolean;
  fleetSavingsPercent: number | null;
  valueScore: number | null;
  quotedAt: string | null;
  // Vehicle specs from provider_rates
  co2Gkm: number | null;
  p11d: number | null;
  fuelType: string | null;
  transmission: string | null;
  insuranceGroup: string | null;
  mpg: string | null;
};

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  drivalia: "Drivalia",
  venus: "Venus Fleet",
};

/**
 * GET /api/admin/vehicle-matrix/[vehicleId]/rates
 * Get all rates for a specific vehicle
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vehicleId } = await params;

    // Get vehicle info
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const rates: VehicleRate[] = [];

    // Get rates from provider_rates using vehicle_id (latest imports only)
    const providerRatesData = await db
      .select({
        id: providerRates.id,
        providerCode: providerRates.providerCode,
        contractType: providerRates.contractType,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        paymentPlan: providerRates.paymentPlan,
        leaseRental: providerRates.leaseRental,
        serviceRental: providerRates.serviceRental,
        totalRental: providerRates.totalRental,
        excessMileagePpm: providerRates.excessMileagePpm,
        p11d: providerRates.p11d,
        score: providerRates.score,
        // Vehicle specs
        co2Gkm: providerRates.co2Gkm,
        fuelType: providerRates.fuelType,
        transmission: providerRates.transmission,
        insuranceGroup: providerRates.insuranceGroup,
        fuelEcoCombined: providerRates.fuelEcoCombined,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(ratebookImports.id, providerRates.importId))
      .where(
        and(
          eq(providerRates.vehicleId, vehicleId),
          eq(ratebookImports.isLatest, true)
        )
      )
      .orderBy(providerRates.term, providerRates.annualMileage);

    for (const rate of providerRatesData) {
      // Use stored score from database
      rates.push({
        id: rate.id,
        source: "provider_rates",
        providerCode: rate.providerCode,
        providerName: PROVIDER_NAMES[rate.providerCode] || rate.providerCode,
        contractType: rate.contractType,
        term: rate.term,
        annualMileage: rate.annualMileage,
        paymentPlan: rate.paymentPlan,
        initialRental: null,
        leaseRental: rate.leaseRental ? rate.leaseRental / 100 : null,
        serviceRental: rate.serviceRental ? rate.serviceRental / 100 : null,
        totalRental: rate.totalRental / 100,
        excessMileagePpm: rate.excessMileagePpm,
        otrp: rate.p11d ? rate.p11d / 100 : vehicle.p11d,
        brokerOtrp: null,
        usedFleetDiscount: false,
        fleetSavingsPercent: null,
        valueScore: rate.score ?? null,
        quotedAt: null,
        // Vehicle specs from provider_rates, fall back to vehicle data
        co2Gkm: rate.co2Gkm ?? vehicle.co2,
        p11d: rate.p11d ? rate.p11d / 100 : vehicle.p11d,
        fuelType: rate.fuelType ?? vehicle.fuelType,
        transmission: rate.transmission ?? vehicle.transmission,
        insuranceGroup: rate.insuranceGroup ?? (vehicle.insuranceGroup ? String(vehicle.insuranceGroup) : null),
        mpg: rate.fuelEcoCombined ?? vehicle.mpg,
      });
    }

    // Get rates from lex_quotes
    const lexQuotesData = await db
      .select()
      .from(lexQuotes)
      .where(eq(lexQuotes.vehicleId, vehicleId))
      .orderBy(desc(lexQuotes.quotedAt));

    // Simple score calculation for lex_quotes (not in provider_rates table)
    const calculateQuoteScore = (rental: number, term: number, p11d: number): number => {
      const ratio = (rental * term) / p11d;
      if (ratio < 0.20) return 95;
      if (ratio < 0.28) return Math.round(95 - ((ratio - 0.20) / 0.08) * 15);
      if (ratio < 0.38) return Math.round(80 - ((ratio - 0.28) / 0.10) * 15);
      if (ratio < 0.48) return Math.round(65 - ((ratio - 0.38) / 0.10) * 15);
      if (ratio < 0.58) return Math.round(50 - ((ratio - 0.48) / 0.10) * 10);
      if (ratio < 0.70) return Math.round(40 - ((ratio - 0.58) / 0.12) * 15);
      return Math.max(10, Math.round(25 - ((ratio - 0.70) / 0.30) * 15));
    };

    for (const quote of lexQuotesData) {
      if (quote.status !== "success") continue;

      // Calculate value score for lex_quotes (not stored in provider_rates)
      const p11dForScore = quote.otrp || (vehicle.p11d ? vehicle.p11d * 100 : null);
      const quoteContractType = quote.contractType || (quote.maintenanceIncluded ? "CH" : "CHNM");
      const quoteScore = quote.monthlyRental && p11dForScore && p11dForScore > 0
        ? calculateQuoteScore(quote.monthlyRental, quote.term, p11dForScore)
        : null;

      rates.push({
        id: quote.id,
        source: "lex_quotes",
        providerCode: "lex",
        providerName: "Lex Autolease",
        contractType: quoteContractType,
        term: quote.term,
        annualMileage: quote.annualMileage,
        paymentPlan: quote.paymentPlan || "spread_3_down",
        initialRental: quote.initialRental ? quote.initialRental / 100 : null,
        leaseRental: quote.monthlyRental ? quote.monthlyRental / 100 : null,
        serviceRental: null,
        totalRental: quote.monthlyRental ? quote.monthlyRental / 100 : 0,
        excessMileagePpm: null,
        otrp: quote.otrp ? quote.otrp / 100 : null,
        brokerOtrp: quote.brokerOtrp ? quote.brokerOtrp / 100 : null,
        usedFleetDiscount: quote.usedFleetDiscount || false,
        fleetSavingsPercent: quote.fleetSavingsPercent ? parseFloat(quote.fleetSavingsPercent) : null,
        valueScore: quoteScore,
        quotedAt: quote.quotedAt?.toISOString() || null,
        co2Gkm: vehicle.co2,
        p11d: vehicle.p11d,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        insuranceGroup: vehicle.insuranceGroup ? String(vehicle.insuranceGroup) : null,
        mpg: vehicle.mpg,
      });
    }

    // Sort by term, then mileage, then provider
    rates.sort((a, b) => {
      if (a.term !== b.term) return a.term - b.term;
      if (a.annualMileage !== b.annualMileage) return a.annualMileage - b.annualMileage;
      return a.providerCode.localeCompare(b.providerCode);
    });

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        capCode: vehicle.capCode,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        variant: vehicle.variant,
        co2: vehicle.co2,
        p11d: vehicle.p11d,
        insuranceGroup: vehicle.insuranceGroup,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        bodyStyle: vehicle.bodyStyle,
        mpg: vehicle.mpg,
        lexMakeCode: vehicle.lexMakeCode,
        lexModelCode: vehicle.lexModelCode,
        lexVariantCode: vehicle.lexVariantCode,
      },
      rates,
    });
  } catch (error) {
    console.error("Error fetching vehicle rates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch rates" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/vehicle-matrix/[vehicleId]/rates
 * Delete specific rates by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vehicleId } = await params;
    const body = await req.json();
    const { rateIds, source } = body as { rateIds: string[]; source: "provider_rates" | "lex_quotes" };

    if (!rateIds || !Array.isArray(rateIds) || rateIds.length === 0) {
      return NextResponse.json({ error: "No rate IDs provided" }, { status: 400 });
    }

    let deletedCount = 0;

    if (source === "lex_quotes") {
      // Delete from lex_quotes table
      const result = await db
        .delete(lexQuotes)
        .where(
          and(
            eq(lexQuotes.vehicleId, vehicleId),
            inArray(lexQuotes.id, rateIds)
          )
        );
      deletedCount = rateIds.length;
    } else if (source === "provider_rates") {
      // Note: Deleting from provider_rates affects the ratebook import
      // This is a destructive operation - consider soft delete instead
      const result = await db
        .delete(providerRates)
        .where(inArray(providerRates.id, rateIds));
      deletedCount = rateIds.length;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} rate(s)`,
    });
  } catch (error) {
    console.error("Error deleting rates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete rates" },
      { status: 500 }
    );
  }
}
