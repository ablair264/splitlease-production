import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { providerRates, ratebookImports, vehicles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const PROVIDER_LABELS: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus Fleet",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/rates/vehicles/[id]/comparison
 *
 * Returns full provider × term comparison grid for a specific vehicle.
 * Used when expanding a vehicle row in Rate Explorer.
 *
 * Query params:
 * - contractType: CH, CHNM, PCH, PCHNM, BSSNL (default: CHNM)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: vehicleId } = await params;
    const { searchParams } = new URL(req.url);
    const contractType = searchParams.get("contractType") || "CHNM";

    // Get vehicle info first
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        capCode: vehicles.capCode,
        manufacturer: vehicles.manufacturer,
        model: vehicles.model,
        variant: vehicles.variant,
        fuelType: vehicles.fuelType,
        transmission: vehicles.transmission,
        bodyStyle: vehicles.bodyStyle,
        co2: vehicles.co2,
        p11d: vehicles.p11d,
        imageFolder: vehicles.imageFolder,
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (!vehicle.capCode) {
      return NextResponse.json({ error: "Vehicle has no CAP code" }, { status: 400 });
    }

    // Get all rates for this vehicle (by CAP code since that's how rates are stored)
    const rates = await db
      .select({
        providerCode: providerRates.providerCode,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        totalRental: providerRates.totalRental,
        leaseRental: providerRates.leaseRental,
        serviceRental: providerRates.serviceRental,
        excessMileagePpm: providerRates.excessMileagePpm,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(providerRates.capCode, vehicle.capCode),
          eq(providerRates.contractType, contractType),
          eq(ratebookImports.isLatest, true)
        )
      )
      .orderBy(
        providerRates.providerCode,
        providerRates.term,
        providerRates.annualMileage
      );

    // Get unique terms and mileages for grid headers
    const terms = new Set<number>();
    const mileages = new Set<number>();
    const providers = new Set<string>();

    rates.forEach((row) => {
      terms.add(row.term);
      mileages.add(row.annualMileage);
      providers.add(row.providerCode);
    });

    // Build comparison grid: provider → term/mileage → price
    const grid: Record<string, Record<string, number | null>> = {};
    const sortedTerms = Array.from(terms).sort((a, b) => a - b);
    const sortedMileages = Array.from(mileages).sort((a, b) => a - b);
    const sortedProviders = Array.from(providers).sort();

    // Initialize grid
    sortedProviders.forEach((p) => {
      grid[p] = {};
      sortedTerms.forEach((t) => {
        sortedMileages.forEach((m) => {
          grid[p][`${t}/${m}`] = null;
        });
      });
    });

    // Populate grid with prices
    let globalBestPrice = Infinity;
    let globalBestCell = "";
    let globalBestProvider = "";

    rates.forEach((row) => {
      const key = `${row.term}/${row.annualMileage}`;
      const price = Number(row.totalRental);
      grid[row.providerCode][key] = price;

      if (price < globalBestPrice) {
        globalBestPrice = price;
        globalBestCell = key;
        globalBestProvider = row.providerCode;
      }
    });

    // Find best price per column (term/mileage combo)
    const bestPerColumn: Record<string, { price: number; provider: string }> = {};
    sortedTerms.forEach((t) => {
      sortedMileages.forEach((m) => {
        const key = `${t}/${m}`;
        let best = Infinity;
        let bestProvider = "";

        sortedProviders.forEach((p) => {
          const price = grid[p][key];
          if (price && price < best) {
            best = price;
            bestProvider = p;
          }
        });

        if (best < Infinity) {
          bestPerColumn[key] = { price: best, provider: bestProvider };
        }
      });
    });

    // Format grid for response
    const comparisonGrid = sortedProviders.map((p) => ({
      providerCode: p,
      providerName: PROVIDER_LABELS[p] || p.toUpperCase(),
      rates: sortedTerms.flatMap((t) =>
        sortedMileages.map((m) => {
          const key = `${t}/${m}`;
          const price = grid[p][key];
          const isBest = bestPerColumn[key]?.provider === p;
          const isGlobalBest = p === globalBestProvider && key === globalBestCell;

          return {
            term: t,
            mileage: m,
            key,
            priceGbp: price ? Math.round(price / 100) : null,
            isBestForConfig: isBest,
            isGlobalBest,
          };
        })
      ),
    }));

    // Calculate value score for best price
    const p11d = vehicle.p11d ? Number(vehicle.p11d) : null;
    let score = 50;
    if (p11d && p11d > 0 && globalBestPrice < Infinity) {
      const ratio = (globalBestPrice * 36) / p11d; // Normalize to 36 months
      if (ratio < 0.20) score = 95;
      else if (ratio < 0.28) score = Math.round(95 - ((ratio - 0.20) / 0.08 * 15));
      else if (ratio < 0.38) score = Math.round(80 - ((ratio - 0.28) / 0.10 * 15));
      else if (ratio < 0.48) score = Math.round(65 - ((ratio - 0.38) / 0.10 * 15));
      else if (ratio < 0.58) score = Math.round(50 - ((ratio - 0.48) / 0.10 * 10));
      else if (ratio < 0.70) score = Math.round(40 - ((ratio - 0.58) / 0.12 * 15));
      else score = Math.max(10, Math.round(25 - ((ratio - 0.70) / 0.30 * 15)));
    }

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        capCode: vehicle.capCode,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        variant: vehicle.variant,
        displayName: vehicle.variant
          ? `${vehicle.manufacturer} ${vehicle.model} ${vehicle.variant}`
          : `${vehicle.manufacturer} ${vehicle.model}`,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        bodyStyle: vehicle.bodyStyle,
        co2: vehicle.co2,
        p11dGbp: p11d ? Math.round(p11d / 100) : null,
        imageUrl: vehicle.imageFolder
          ? `/images/vehicles/${vehicle.imageFolder}/front_view.webp`
          : null,
        bestScore: score,
      },
      grid: {
        terms: sortedTerms,
        mileages: sortedMileages.map((m) => ({
          value: m,
          label: `${m / 1000}k`,
        })),
        providers: comparisonGrid,
      },
      globalBest: globalBestPrice < Infinity
        ? {
            priceGbp: Math.round(globalBestPrice / 100),
            provider: globalBestProvider,
            providerName: PROVIDER_LABELS[globalBestProvider] || globalBestProvider.toUpperCase(),
            config: globalBestCell,
          }
        : null,
      contractType,
    });
  } catch (error) {
    console.error("Error fetching vehicle comparison:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comparison" },
      { status: 500 }
    );
  }
}
