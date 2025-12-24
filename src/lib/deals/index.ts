import { db, vehicles, vehiclePricing } from "@/lib/db";
import { eq, and, gte, lte, ilike, or, sql, desc, asc, ne } from "drizzle-orm";
import type { VehiclePreferences, BudgetInfo } from "@/lib/db/schema";

export type MatchedDeal = {
  vehicleId: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  p11d: number | null;
  co2: number | null;
  term: number;
  annualMileage: number;
  monthlyRental: number; // in pounds
  providerName: string;
  score: number; // Deal value score
  matchReason: string[];
};

// Vehicle grouping by make+model with multiple pricing options
export type VehicleGroup = {
  groupKey: string; // manufacturer-model
  manufacturer: string;
  model: string;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  avgP11d: number | null;
  avgCo2: number | null;
  bestScore: number;
  deals: MatchedDeal[]; // Multiple variants/pricing options
  isAlternative: boolean;
};

export type GroupedDealsResult = {
  primaryMatches: VehicleGroup[]; // Exact matches for requested vehicle
  alternatives: VehicleGroup[]; // Similar vehicles they might also like
};

// Vehicle segment mapping - groups similar competitors together
const vehicleSegments: Record<string, string[][]> = {
  // Premium compact hatchbacks
  premiumCompact: [
    ["Audi", "A1"],
    ["BMW", "1 Series"],
    ["Mercedes-Benz", "A-Class"],
    ["Mini", "Hatch"],
    ["Volvo", "V40"],
  ],
  // Mainstream compact hatchbacks
  compact: [
    ["Volkswagen", "Polo"],
    ["Ford", "Fiesta"],
    ["Vauxhall", "Corsa"],
    ["Peugeot", "208"],
    ["Renault", "Clio"],
    ["Toyota", "Yaris"],
    ["Hyundai", "i20"],
    ["Kia", "Rio"],
    ["Seat", "Ibiza"],
    ["Skoda", "Fabia"],
  ],
  // Premium medium saloons/hatchbacks
  premiumMedium: [
    ["Audi", "A3"],
    ["BMW", "2 Series"],
    ["Mercedes-Benz", "CLA"],
    ["Volvo", "V60"],
  ],
  // Mainstream medium hatchbacks
  medium: [
    ["Volkswagen", "Golf"],
    ["Ford", "Focus"],
    ["Vauxhall", "Astra"],
    ["Peugeot", "308"],
    ["Renault", "Megane"],
    ["Toyota", "Corolla"],
    ["Hyundai", "i30"],
    ["Kia", "Ceed"],
    ["Seat", "Leon"],
    ["Skoda", "Octavia"],
    ["Mazda", "3"],
    ["Honda", "Civic"],
  ],
  // Executive saloons
  executive: [
    ["Audi", "A4"],
    ["BMW", "3 Series"],
    ["Mercedes-Benz", "C-Class"],
    ["Jaguar", "XE"],
    ["Volvo", "S60"],
    ["Lexus", "IS"],
  ],
  // Large executive
  largeExecutive: [
    ["Audi", "A6"],
    ["BMW", "5 Series"],
    ["Mercedes-Benz", "E-Class"],
    ["Jaguar", "XF"],
    ["Volvo", "S90"],
    ["Lexus", "ES"],
  ],
  // Compact SUV/Crossover
  compactSuv: [
    ["Audi", "Q2"],
    ["BMW", "X1"],
    ["Mercedes-Benz", "GLA"],
    ["Volvo", "XC40"],
    ["Volkswagen", "T-Roc"],
    ["Ford", "Puma"],
    ["Peugeot", "2008"],
    ["Renault", "Captur"],
    ["Toyota", "C-HR"],
    ["Hyundai", "Kona"],
    ["Kia", "Stonic"],
    ["Seat", "Arona"],
    ["Skoda", "Kamiq"],
    ["Nissan", "Juke"],
    ["Mini", "Countryman"],
  ],
  // Medium SUV
  mediumSuv: [
    ["Audi", "Q3"],
    ["BMW", "X2"],
    ["Mercedes-Benz", "GLB"],
    ["Volkswagen", "Tiguan"],
    ["Ford", "Kuga"],
    ["Peugeot", "3008"],
    ["Toyota", "RAV4"],
    ["Hyundai", "Tucson"],
    ["Kia", "Sportage"],
    ["Seat", "Ateca"],
    ["Skoda", "Karoq"],
    ["Nissan", "Qashqai"],
    ["Mazda", "CX-5"],
    ["Honda", "CR-V"],
  ],
  // Large SUV
  largeSuv: [
    ["Audi", "Q5"],
    ["BMW", "X3"],
    ["Mercedes-Benz", "GLC"],
    ["Volvo", "XC60"],
    ["Land Rover", "Discovery Sport"],
    ["Jaguar", "F-Pace"],
    ["Lexus", "NX"],
  ],
  // Premium large SUV
  premiumLargeSuv: [
    ["Audi", "Q7"],
    ["BMW", "X5"],
    ["Mercedes-Benz", "GLE"],
    ["Volvo", "XC90"],
    ["Land Rover", "Discovery"],
    ["Porsche", "Cayenne"],
    ["Lexus", "RX"],
  ],
  // Electric vehicles
  electricCompact: [
    ["Tesla", "Model 3"],
    ["BMW", "i4"],
    ["Polestar", "2"],
    ["Hyundai", "Ioniq 6"],
    ["Kia", "EV6"],
  ],
  electricSuv: [
    ["Tesla", "Model Y"],
    ["Audi", "Q4 e-tron"],
    ["BMW", "iX3"],
    ["Mercedes-Benz", "EQA"],
    ["Volvo", "XC40 Recharge"],
    ["Volkswagen", "ID.4"],
    ["Hyundai", "Ioniq 5"],
    ["Kia", "EV6"],
    ["Ford", "Mustang Mach-E"],
  ],
};

// Find alternatives for a given make/model
function findAlternatives(make: string, model: string): Array<{ make: string; model: string }> {
  const alternatives: Array<{ make: string; model: string }> = [];
  const makeLower = make.toLowerCase();
  const modelLower = model.toLowerCase();

  for (const segment of Object.values(vehicleSegments)) {
    const match = segment.find(
      ([m, mod]) =>
        m.toLowerCase() === makeLower &&
        modelLower.includes(mod.toLowerCase())
    );

    if (match) {
      // Found the segment - add other vehicles as alternatives
      for (const [altMake, altModel] of segment) {
        if (altMake.toLowerCase() !== makeLower || !modelLower.includes(altModel.toLowerCase())) {
          alternatives.push({ make: altMake, model: altModel });
        }
      }
      break;
    }
  }

  return alternatives.slice(0, 5); // Limit to 5 alternatives
}

export async function findMatchingDeals(
  preferences: VehiclePreferences,
  budget: BudgetInfo,
  limit = 5
): Promise<MatchedDeal[]> {
  // Build conditions based on preferences
  const conditions = [];

  // Manufacturer filter
  if (preferences.makes && preferences.makes.length > 0) {
    const makeConditions = preferences.makes.map((make) =>
      ilike(vehicles.manufacturer, `%${make}%`)
    );
    conditions.push(or(...makeConditions));
  }

  // Model filter
  if (preferences.models && preferences.models.length > 0) {
    const modelConditions = preferences.models.map((model) =>
      or(
        ilike(vehicles.model, `%${model}%`),
        ilike(vehicles.variant, `%${model}%`)
      )
    );
    conditions.push(or(...modelConditions));
  }

  // Body type filter
  if (preferences.bodyTypes && preferences.bodyTypes.length > 0) {
    const bodyConditions = preferences.bodyTypes.map((body) =>
      ilike(vehicles.bodyStyle, `%${body}%`)
    );
    conditions.push(or(...bodyConditions));
  }

  // Fuel type filter
  if (preferences.fuelTypes && preferences.fuelTypes.length > 0) {
    const fuelConditions = preferences.fuelTypes.map((fuel) =>
      ilike(vehicles.fuelType, `%${fuel}%`)
    );
    conditions.push(or(...fuelConditions));
  }

  // Transmission filter
  if (preferences.transmission) {
    conditions.push(ilike(vehicles.transmission, `%${preferences.transmission}%`));
  }

  // Budget filter on pricing - only filter by max budget, score the rest
  const pricingConditions = [];
  if (budget.maxMonthly) {
    // Monthly rental stored in pence, budget in pounds
    // Add 20% buffer to find slightly over-budget options too
    pricingConditions.push(lte(vehiclePricing.monthlyRental, budget.maxMonthly * 120));
  }

  // Don't filter strictly by term/mileage - we'll score by preference instead
  // This allows finding deals even if exact term/mileage isn't available

  // Query vehicles with pricing
  const query = db
    .select({
      vehicleId: vehicles.id,
      manufacturer: vehicles.manufacturer,
      model: vehicles.model,
      variant: vehicles.variant,
      fuelType: vehicles.fuelType,
      transmission: vehicles.transmission,
      bodyStyle: vehicles.bodyStyle,
      p11d: vehicles.p11d,
      co2: vehicles.co2,
      term: vehiclePricing.term,
      annualMileage: vehiclePricing.annualMileage,
      monthlyRental: vehiclePricing.monthlyRental,
      providerName: vehiclePricing.providerName,
    })
    .from(vehicles)
    .innerJoin(vehiclePricing, eq(vehicles.id, vehiclePricing.vehicleId));

  // Apply vehicle conditions
  if (conditions.length > 0) {
    query.where(and(...conditions, ...pricingConditions));
  } else if (pricingConditions.length > 0) {
    query.where(and(...pricingConditions));
  }

  // Order by monthly rental (best value first)
  query.orderBy(asc(vehiclePricing.monthlyRental));
  query.limit(limit * 3); // Get more to score and filter

  const results = await query;

  // Score and rank results
  const scoredDeals: MatchedDeal[] = results.map((row) => {
    const monthlyPounds = row.monthlyRental / 100;
    const matchReasons: string[] = [];

    // Calculate deal value score - start at 30, max is ~90
    let score = 30;

    // P11D to monthly rental ratio (this is the key value metric)
    // Lower ratio = better value
    if (row.p11d && row.term) {
      const totalCost = monthlyPounds * row.term;
      const costRatio = totalCost / row.p11d;

      if (costRatio < 0.25) {
        score += 35;
        matchReasons.push("Exceptional value");
      } else if (costRatio < 0.35) {
        score += 25;
        matchReasons.push("Great value");
      } else if (costRatio < 0.45) {
        score += 15;
        matchReasons.push("Good value");
      } else if (costRatio < 0.55) {
        score += 5;
        matchReasons.push("Fair value");
      }
      // Above 0.55 ratio - no bonus
    }

    // Manufacturer match (+10 max)
    if (preferences.makes?.some((m) =>
      row.manufacturer.toLowerCase().includes(m.toLowerCase())
    )) {
      score += 10;
      matchReasons.push(`${row.manufacturer}`);
    }

    // Model match (+10 max)
    if (preferences.models?.some((m) =>
      row.model.toLowerCase().includes(m.toLowerCase()) ||
      row.variant?.toLowerCase().includes(m.toLowerCase())
    )) {
      score += 10;
      matchReasons.push(`Matches model preference`);
    }

    // Fuel type match (+5)
    if (preferences.fuelTypes?.some((f) =>
      row.fuelType?.toLowerCase().includes(f.toLowerCase())
    )) {
      score += 5;
      matchReasons.push(`${row.fuelType}`);
    }

    // Budget fit (+5)
    if (budget.maxMonthly && monthlyPounds <= budget.maxMonthly) {
      score += 5;
      matchReasons.push(`Within budget`);
    }

    // Low CO2 bonus (+5)
    if (row.co2 && row.co2 < 100) {
      score += 5;
      matchReasons.push(`Low emissions`);
    }

    return {
      vehicleId: row.vehicleId,
      manufacturer: row.manufacturer,
      model: row.model,
      variant: row.variant,
      fuelType: row.fuelType,
      transmission: row.transmission,
      bodyStyle: row.bodyStyle,
      p11d: row.p11d,
      co2: row.co2,
      term: row.term,
      annualMileage: row.annualMileage,
      monthlyRental: monthlyPounds,
      providerName: row.providerName,
      score: Math.min(100, score),
      matchReason: matchReasons,
    };
  });

  // Sort by score and return top matches
  return scoredDeals
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatDealSummary(deals: MatchedDeal[]): string {
  if (deals.length === 0) {
    return "No matching vehicles found in our current inventory.";
  }

  const lines = ["**Top Matching Deals:**\n"];

  deals.forEach((deal, i) => {
    const desc = `${deal.manufacturer} ${deal.model}${deal.variant ? ` ${deal.variant}` : ""}`;
    lines.push(
      `${i + 1}. **${desc}**\n` +
      `   £${deal.monthlyRental.toFixed(2)}/mo | ${deal.term}mo | ${deal.annualMileage.toLocaleString()} miles/yr\n` +
      `   ${deal.matchReason.slice(0, 2).join(" • ")}`
    );
  });

  return lines.join("\n");
}

// Group deals by make+model and find alternatives
function groupDeals(deals: MatchedDeal[], isAlternative: boolean = false): VehicleGroup[] {
  const groups = new Map<string, VehicleGroup>();

  for (const deal of deals) {
    // Create group key from manufacturer + base model (without variant details)
    // Extract model name - remove manufacturer if it's at the start, then take first word
    let baseModel = deal.model;
    if (baseModel.toLowerCase().startsWith(deal.manufacturer.toLowerCase())) {
      baseModel = baseModel.slice(deal.manufacturer.length).trim();
    }
    baseModel = baseModel.split(" ")[0] || deal.model; // e.g., "A1" from "A1 Sportback"
    const groupKey = `${deal.manufacturer.toLowerCase()}-${baseModel.toLowerCase()}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        manufacturer: deal.manufacturer,
        model: baseModel,
        fuelType: deal.fuelType,
        transmission: deal.transmission,
        bodyStyle: deal.bodyStyle,
        avgP11d: deal.p11d,
        avgCo2: deal.co2,
        bestScore: deal.score,
        deals: [],
        isAlternative,
      });
    }

    const group = groups.get(groupKey)!;
    group.deals.push(deal);

    // Update best score
    if (deal.score > group.bestScore) {
      group.bestScore = deal.score;
    }
  }

  // Sort deals within each group by price (cheapest first)
  for (const group of Array.from(groups.values())) {
    group.deals.sort((a, b) => a.monthlyRental - b.monthlyRental);

    // Calculate averages
    const p11ds = group.deals.filter((d) => d.p11d).map((d) => d.p11d!);
    const co2s = group.deals.filter((d) => d.co2).map((d) => d.co2!);

    if (p11ds.length > 0) {
      group.avgP11d = Math.round(p11ds.reduce((a, b) => a + b, 0) / p11ds.length);
    }
    if (co2s.length > 0) {
      group.avgCo2 = Math.round(co2s.reduce((a, b) => a + b, 0) / co2s.length);
    }
  }

  // Sort groups by best score
  return Array.from(groups.values()).sort((a, b) => b.bestScore - a.bestScore);
}

// Find grouped deals with alternatives
export async function findGroupedDeals(
  preferences: VehiclePreferences,
  budget: BudgetInfo,
  options: { primaryLimit?: number; alternativesLimit?: number } = {}
): Promise<GroupedDealsResult> {
  const { primaryLimit = 3, alternativesLimit = 3 } = options;

  // Get primary matches (more results to allow for grouping)
  const primaryDeals = await findMatchingDeals(preferences, budget, 15);

  // Group primary deals
  const primaryGroups = groupDeals(primaryDeals, false).slice(0, primaryLimit);

  // Find alternatives based on the requested makes/models
  const alternativeGroups: VehicleGroup[] = [];

  if (preferences.makes && preferences.makes.length > 0 && preferences.models && preferences.models.length > 0) {
    // Find alternatives for the primary requested vehicle
    const alternatives = findAlternatives(preferences.makes[0], preferences.models[0]);

    if (alternatives.length > 0) {
      // Search for alternative vehicles
      for (const alt of alternatives.slice(0, 3)) {
        const altPrefs: VehiclePreferences = {
          ...preferences,
          makes: [alt.make],
          models: [alt.model],
        };

        const altDeals = await findMatchingDeals(altPrefs, budget, 5);
        if (altDeals.length > 0) {
          const altGroups = groupDeals(altDeals, true);
          if (altGroups.length > 0) {
            alternativeGroups.push(altGroups[0]);
          }
        }

        if (alternativeGroups.length >= alternativesLimit) break;
      }
    }
  }

  // If no specific model was requested, find alternatives based on body type or budget
  if (alternativeGroups.length === 0 && primaryGroups.length > 0) {
    // Find alternatives in same body style but different make
    const primaryMakes = primaryGroups.map((g) => g.manufacturer.toLowerCase());
    const bodyStyle = primaryGroups[0]?.bodyStyle;

    if (bodyStyle) {
      const altPrefs: VehiclePreferences = {
        ...preferences,
        makes: undefined, // Remove make filter
        models: undefined,
        bodyTypes: [bodyStyle],
      };

      const altDeals = await findMatchingDeals(altPrefs, budget, 15);
      const filteredAltDeals = altDeals.filter(
        (d) => !primaryMakes.includes(d.manufacturer.toLowerCase())
      );

      if (filteredAltDeals.length > 0) {
        const altGroups = groupDeals(filteredAltDeals, true);
        alternativeGroups.push(...altGroups.slice(0, alternativesLimit));
      }
    }
  }

  return {
    primaryMatches: primaryGroups,
    alternatives: alternativeGroups.slice(0, alternativesLimit),
  };
}

// Format grouped deals for email
export function formatGroupedDealSummary(result: GroupedDealsResult): string {
  if (result.primaryMatches.length === 0) {
    return "No matching vehicles found in our current inventory.";
  }

  const lines: string[] = [];

  // Primary matches
  lines.push("**Your Matching Vehicles:**\n");
  result.primaryMatches.forEach((group, i) => {
    const priceRange = group.deals.length > 1
      ? `from £${group.deals[0].monthlyRental.toFixed(0)}/mo`
      : `£${group.deals[0].monthlyRental.toFixed(2)}/mo`;

    lines.push(
      `${i + 1}. **${group.manufacturer} ${group.model}** - ${priceRange}`
    );
    lines.push(`   ${group.deals.length} option${group.deals.length > 1 ? "s" : ""} available`);
  });

  // Alternatives
  if (result.alternatives.length > 0) {
    lines.push("\n**You might also like:**\n");
    result.alternatives.forEach((group) => {
      const priceRange = group.deals.length > 1
        ? `from £${group.deals[0].monthlyRental.toFixed(0)}/mo`
        : `£${group.deals[0].monthlyRental.toFixed(2)}/mo`;

      lines.push(`• **${group.manufacturer} ${group.model}** - ${priceRange}`);
    });
  }

  return lines.join("\n");
}
