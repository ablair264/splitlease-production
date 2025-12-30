import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type MarketPosition = "lowest" | "below-avg" | "average" | "above-avg" | "highest";

export type MarketPositionData = {
  capCode: string;
  vehicleId: string | null;
  ourPrice: number; // pence
  marketMin: number; // pence
  marketMax: number; // pence
  marketAvg: number; // pence
  competitorCount: number;
  percentile: number; // 0-100, lower is better
  position: MarketPosition;
  priceDelta: number; // pence, negative = we're cheaper
  priceDeltaPercent: number;
};

/**
 * GET /api/admin/rates/market-position
 *
 * Returns market position data for vehicles, comparing our rates to competitor prices.
 *
 * Query params:
 * - capCodes: comma-separated CAP codes (required, max 100)
 * - contractType: CH, CHNM, PCH, PCHNM (default: CHNM)
 * - term: 24, 36, 48 (default: 36)
 * - mileage: annual mileage (default: 10000)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const capCodesParam = searchParams.get("capCodes");
    const contractType = searchParams.get("contractType") || "CHNM";
    const term = parseInt(searchParams.get("term") || "36");
    const mileage = parseInt(searchParams.get("mileage") || "10000");

    if (!capCodesParam) {
      return NextResponse.json(
        { error: "capCodes parameter required" },
        { status: 400 }
      );
    }

    const capCodes = capCodesParam.split(",").slice(0, 100); // Limit to 100

    if (capCodes.length === 0) {
      return NextResponse.json({ positions: [] });
    }

    // Determine lease type for market intelligence matching
    const isPersonal = contractType.startsWith("PCH");
    const leaseType = isPersonal ? "personal" : "business";

    // Query our best prices and market intelligence in one go
    const result = await db.execute(sql`
      WITH our_rates AS (
        SELECT DISTINCT ON (pr.cap_code)
          pr.cap_code,
          pr.vehicle_id,
          pr.total_rental as our_price,
          pr.provider_code
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id
        WHERE ri.is_latest = true
          AND pr.contract_type = ${contractType}
          AND pr.term = ${term}
          AND pr.annual_mileage = ${mileage}
          AND pr.cap_code IN (${sql.join(capCodes.map(c => sql`${c}`), sql`, `)})
        ORDER BY pr.cap_code, pr.total_rental ASC
      ),
      market_stats AS (
        SELECT
          mid.matched_cap_code as cap_code,
          MIN(mid.monthly_price) as market_min,
          MAX(mid.monthly_price) as market_max,
          AVG(mid.monthly_price)::integer as market_avg,
          COUNT(DISTINCT mid.source) as competitor_count
        FROM market_intelligence_deals mid
        JOIN market_intelligence_snapshots mis ON mis.id = mid.snapshot_id
        WHERE mid.matched_cap_code IN (${sql.join(capCodes.map(c => sql`${c}`), sql`, `)})
          AND mid.matched_cap_code IS NOT NULL
          AND (mid.lease_type = ${leaseType} OR mid.lease_type IS NULL)
          AND (mid.term IS NULL OR mid.term = ${term})
          AND mis.snapshot_date > NOW() - INTERVAL '7 days'
        GROUP BY mid.matched_cap_code
      )
      SELECT
        our.cap_code,
        our.vehicle_id,
        our.our_price,
        our.provider_code,
        COALESCE(ms.market_min, our.our_price) as market_min,
        COALESCE(ms.market_max, our.our_price) as market_max,
        COALESCE(ms.market_avg, our.our_price) as market_avg,
        COALESCE(ms.competitor_count, 0) as competitor_count
      FROM our_rates our
      LEFT JOIN market_stats ms ON ms.cap_code = our.cap_code
    `);

    const positions: MarketPositionData[] = (result.rows as Array<{
      cap_code: string;
      vehicle_id: string | null;
      our_price: number;
      provider_code: string;
      market_min: number;
      market_max: number;
      market_avg: number;
      competitor_count: number;
    }>).map((row) => {
      const ourPrice = Number(row.our_price);
      const marketMin = Number(row.market_min);
      const marketMax = Number(row.market_max);
      const marketAvg = Number(row.market_avg);
      const competitorCount = Number(row.competitor_count);

      // Calculate percentile (0 = cheapest, 100 = most expensive)
      let percentile = 50; // Default if no market data
      if (marketMax > marketMin) {
        percentile = Math.round(((ourPrice - marketMin) / (marketMax - marketMin)) * 100);
        percentile = Math.max(0, Math.min(100, percentile));
      } else if (competitorCount > 0) {
        // Same price as all competitors
        percentile = 50;
      }

      // Determine position label
      let position: MarketPosition;
      if (percentile <= 10) {
        position = "lowest";
      } else if (percentile <= 40) {
        position = "below-avg";
      } else if (percentile <= 60) {
        position = "average";
      } else if (percentile <= 90) {
        position = "above-avg";
      } else {
        position = "highest";
      }

      // Calculate delta from market average
      const priceDelta = ourPrice - marketAvg;
      const priceDeltaPercent = marketAvg > 0
        ? Math.round((priceDelta / marketAvg) * 100)
        : 0;

      return {
        capCode: row.cap_code,
        vehicleId: row.vehicle_id,
        ourPrice,
        marketMin,
        marketMax,
        marketAvg,
        competitorCount,
        percentile,
        position,
        priceDelta,
        priceDeltaPercent,
      };
    });

    return NextResponse.json({
      positions,
      filters: { contractType, term, mileage },
    });
  } catch (error) {
    console.error("Error fetching market positions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch market positions" },
      { status: 500 }
    );
  }
}
