import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

/**
 * Scheduled function to scrape competitor pricing data
 * Runs twice daily at 6am and 6pm UTC
 *
 * Performs scraping directly instead of calling API route to avoid timeout issues
 */

interface LeasingComDeal {
  Manufacturer: string;
  Range: string;
  DealCount: number;
  ImagePath: string;
  LowestInitialPayment: number;
  MinMonthlyPrice: number;
  MinTotalLeaseCost: number;
  MaxLeasingValueScore: number;
  MaxDeliveryTime: number | null;
  RankingByEnquiryCount: number;
}

interface FetchResult {
  source: string;
  dealsCount: number;
  error?: string;
}

async function fetchLeasingComDeals(): Promise<LeasingComDeal[]> {
  const requestBody = {
    searchCriteria: {
      facets: [],
      matches: [
        { matchWith: "Car", fieldName: "vehicleType" },
        { matchWith: "Personal", fieldName: "FinanceType" },
        null,
        null,
      ],
      ranges: [],
      partialMatches: [],
    },
    pagination: {
      itemsPerPage: 50,
      pageNumber: 1,
    },
    orderBy: {
      fieldName: "popular",
      friendlyName: "Most popular",
      direction: "descending",
    },
  };

  const response = await fetch(
    "https://leasing.com/api/deals/search/popular-manufacturer-ranges/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Origin: "https://leasing.com",
        Referer: "https://leasing.com/car-leasing/",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Leasing.com API error: ${response.status}`);
  }

  const data = await response.json();
  return data.Items || [];
}

export default async function handler(req: Request, context: Context) {
  const startTime = Date.now();
  console.log(`[Scrape Competitors] Starting at ${new Date().toISOString()}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Scrape Competitors] DATABASE_URL not configured");
    return new Response(
      JSON.stringify({ success: false, error: "DATABASE_URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const sql = neon(databaseUrl);
  const results: FetchResult[] = [];

  // Fetch from Leasing.com
  try {
    console.log("[Scrape Competitors] Fetching from Leasing.com...");
    const deals = await fetchLeasingComDeals();
    console.log(`[Scrape Competitors] Got ${deals.length} deals from Leasing.com`);

    if (deals.length > 0) {
      // Calculate aggregates
      const prices = deals.map(d => Math.round(d.MinMonthlyPrice * 100));
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      // Create snapshot
      const snapshotResult = await sql`
        INSERT INTO market_intelligence_snapshots (source, total_deals_count, avg_monthly_price, price_range, raw_data)
        VALUES (
          'leasing_com',
          ${deals.length},
          ${avgPrice},
          ${JSON.stringify({ min: Math.min(...prices), max: Math.max(...prices) })},
          ${JSON.stringify({ fetchedAt: new Date().toISOString() })}
        )
        RETURNING id
      `;

      const snapshotId = snapshotResult[0].id;
      console.log(`[Scrape Competitors] Created snapshot: ${snapshotId}`);

      // Insert deals
      for (const deal of deals) {
        const externalId = `${deal.Manufacturer}-${deal.Range}`.toLowerCase().replace(/\s+/g, '-');
        const monthlyPrice = Math.round(deal.MinMonthlyPrice * 100);
        const initialPayment = Math.round(deal.LowestInitialPayment * 100);
        const valueScore = Math.round(deal.MaxLeasingValueScore * 10);

        // Try to match CAP code
        const matchResult = await sql`
          SELECT cap_code FROM vehicles
          WHERE LOWER(manufacturer) = LOWER(${deal.Manufacturer})
            AND LOWER(model) LIKE LOWER(${deal.Range + '%'})
          LIMIT 1
        `;
        const matchedCapCode = matchResult[0]?.cap_code || null;

        await sql`
          INSERT INTO market_intelligence_deals (
            snapshot_id, source, external_id, manufacturer, model,
            monthly_price, initial_payment, value_score, deal_count,
            stock_status, image_url, lease_type, vat_included, matched_cap_code, raw_data
          ) VALUES (
            ${snapshotId}, 'leasing_com', ${externalId}, ${deal.Manufacturer}, ${deal.Range},
            ${monthlyPrice}, ${initialPayment}, ${valueScore}, ${deal.DealCount},
            ${deal.MaxDeliveryTime === null ? 'order' : 'in_stock'}, ${deal.ImagePath},
            'personal', true, ${matchedCapCode}, ${JSON.stringify(deal)}
          )
        `;
      }

      results.push({ source: 'leasing_com', dealsCount: deals.length });
    }
  } catch (error) {
    console.error("[Scrape Competitors] Leasing.com error:", error);
    results.push({
      source: 'leasing_com',
      dealsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const duration = Date.now() - startTime;
  console.log(`[Scrape Competitors] Completed in ${duration}ms`);
  console.log(`[Scrape Competitors] Results:`, results);

  return new Response(
    JSON.stringify({
      success: true,
      results,
      totalDeals: results.reduce((sum, r) => sum + r.dealsCount, 0),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// Schedule: Run at 6:00 AM and 6:00 PM UTC daily
export const config: Config = {
  schedule: "0 6,18 * * *",
};
