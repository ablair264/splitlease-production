import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerRates, ratebookImports } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
  ald: "ALD Automotive",
};

// Parse payment plan to get initial months
// Handles: "monthly_in_advance" -> 1, "spread_3_down" -> 3, "spread_6_down" -> 6, etc.
// Also handles legacy "X+Y" format: "6+23" -> 6, "1+35" -> 1
function parseInitialMonths(paymentPlan: string): number {
  // Handle spread_X_down format
  const spreadMatch = paymentPlan.match(/spread_(\d+)_down/);
  if (spreadMatch) {
    return parseInt(spreadMatch[1], 10);
  }

  // Handle monthly_in_advance
  if (paymentPlan === "monthly_in_advance") {
    return 1;
  }

  // Handle legacy X+Y format
  const legacyMatch = paymentPlan.match(/^(\d+)\+/);
  if (legacyMatch) {
    return parseInt(legacyMatch[1], 10);
  }

  return 1; // Default to 1 month initial
}

// Check if contract type includes maintenance
function hasMaintenance(contractType: string): boolean {
  return contractType === "CH" || contractType === "PCH";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;

    // Get ALL rates for this vehicle from latest ratebooks (no mileage filter)
    const rates = await db
      .select({
        providerCode: providerRates.providerCode,
        term: providerRates.term,
        paymentPlan: providerRates.paymentPlan,
        monthlyRental: providerRates.totalRental,
        contractType: providerRates.contractType,
        annualMileage: providerRates.annualMileage,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(providerRates.vehicleId, vehicleId),
          eq(ratebookImports.isLatest, true)
        )
      )
      .orderBy(
        providerRates.annualMileage,
        providerRates.providerCode,
        providerRates.term
      );

    // Get unique mileages
    const mileageSet = new Set<number>();
    rates.forEach((r) => {
      if (r.annualMileage !== null) {
        mileageSet.add(r.annualMileage);
      }
    });
    const availableMileages = Array.from(mileageSet).sort((a, b) => a - b);

    // Transform rates with mileage included
    const transformedRates = rates.map((rate) => ({
      providerCode: rate.providerCode,
      providerName: PROVIDER_NAMES[rate.providerCode] || rate.providerCode,
      term: rate.term,
      initialPaymentMonths: parseInitialMonths(rate.paymentPlan),
      monthlyRental: Math.round(Number(rate.monthlyRental) / 100),
      contractType: rate.contractType,
      includesMaintenance: hasMaintenance(rate.contractType),
      annualMileage: rate.annualMileage,
    }));

    // Group by mileage, then by contract type
    const ratesByMileage: Record<number, {
      contractHire: typeof transformedRates;
      personalContractHire: typeof transformedRates;
    }> = {};

    availableMileages.forEach((mileage) => {
      const mileageRates = transformedRates.filter((r) => r.annualMileage === mileage);
      ratesByMileage[mileage] = {
        contractHire: mileageRates.filter(
          (r) => r.contractType === "CH" || r.contractType === "CHNM"
        ),
        personalContractHire: mileageRates.filter(
          (r) => r.contractType === "PCH" || r.contractType === "PCHNM"
        ),
      };
    });

    return NextResponse.json({
      ratesByMileage,
      availableMileages,
    });
  } catch (error) {
    console.error("Error fetching rates matrix:", error);
    return NextResponse.json(
      { error: "Failed to fetch rates matrix" },
      { status: 500 }
    );
  }
}
