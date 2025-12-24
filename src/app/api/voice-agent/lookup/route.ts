import { NextRequest, NextResponse } from "next/server";
import { findGroupedDeals } from "@/lib/deals";
import type { VehiclePreferences, BudgetInfo } from "@/lib/db/schema";

// API endpoint for ElevenLabs voice agent to lookup vehicle deals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { make, model, budget, mileage, term, fuelType, transmission } = body;

    // Build preferences from agent-gathered data
    const preferences: VehiclePreferences = {
      makes: make ? [make] : undefined,
      models: model ? [model] : undefined,
      fuelTypes: fuelType ? [fuelType] : undefined,
      transmission: transmission || undefined,
    };

    // Build budget info
    const budgetInfo: BudgetInfo = {
      maxMonthly: budget ? parseFloat(budget) : 500,
      preferredMileage: mileage ? parseInt(mileage) : 10000,
      preferredTerm: term ? parseInt(term) : 36,
    };

    // Find grouped deals with alternatives
    const result = await findGroupedDeals(preferences, budgetInfo, {
      primaryLimit: 2,
      alternativesLimit: 2,
    });

    // Format response for voice agent
    const primaryVehicles = result.primaryMatches.map((group) => ({
      make: group.manufacturer,
      model: group.model,
      startingPrice: group.deals[0]?.monthlyRental.toFixed(2),
      optionsCount: group.deals.length,
      fuelType: group.fuelType,
      transmission: group.transmission,
      co2: group.avgCo2,
    }));

    const alternativeVehicles = result.alternatives.map((group) => ({
      make: group.manufacturer,
      model: group.model,
      startingPrice: group.deals[0]?.monthlyRental.toFixed(2),
      optionsCount: group.deals.length,
      fuelType: group.fuelType,
      transmission: group.transmission,
      co2: group.avgCo2,
    }));

    // Build a natural language summary for the agent
    let summary = "";

    if (primaryVehicles.length > 0) {
      const primary = primaryVehicles[0];
      summary = `Found ${primary.make} ${primary.model} starting from £${primary.startingPrice} per month with ${primary.optionsCount} variants available.`;

      if (alternativeVehicles.length > 0) {
        const alt = alternativeVehicles[0];
        summary += ` Also found ${alt.make} ${alt.model} from £${alt.startingPrice} per month as an alternative.`;
      }
    } else if (alternativeVehicles.length > 0) {
      const alt = alternativeVehicles[0];
      summary = `The exact vehicle wasn't available, but found ${alt.make} ${alt.model} starting from £${alt.startingPrice} per month.`;
    } else {
      summary = "No matching vehicles found within the specified criteria.";
    }

    return NextResponse.json({
      success: true,
      found: primaryVehicles.length > 0 || alternativeVehicles.length > 0,
      summary,
      primaryVehicles,
      alternativeVehicles,
      searchCriteria: {
        make,
        model,
        budget,
        mileage,
        term,
      },
    });
  } catch (error) {
    console.error("Voice agent lookup error:", error);
    return NextResponse.json(
      {
        success: false,
        found: false,
        summary: "I'm having trouble looking up vehicles right now. Let me transfer you to a colleague who can help.",
        error: "Internal server error"
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const testRequest = new Request(request.url, {
    method: "POST",
    body: JSON.stringify({
      make: searchParams.get("make") || "Audi",
      model: searchParams.get("model") || "A1",
      budget: searchParams.get("budget") || "400",
      mileage: searchParams.get("mileage") || "10000",
    }),
  });

  return POST(testRequest as NextRequest);
}
