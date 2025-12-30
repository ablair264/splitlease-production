import type { Config, Context } from "@netlify/functions";

/**
 * Scheduled function to scrape competitor pricing data
 * Runs twice daily at 6am and 6pm UTC
 */
export default async function handler(req: Request, context: Context) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  console.log(`[Scrape Competitors] Starting scheduled scrape at ${new Date().toISOString()}`);

  try {
    // Call the intelligence fetch endpoint
    const response = await fetch(`${baseUrl}/api/admin/intelligence/fetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass cron secret for authentication
        ...(cronSecret && { "x-cron-secret": cronSecret }),
      },
      body: JSON.stringify({
        sources: [
          "leasing_com",
          "leaseloco",
          "appliedleasing",
          "selectcarleasing",
          "vipgateway",
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Scrape Competitors] Fetch failed: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Fetch failed: ${response.status}`
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    console.log(`[Scrape Competitors] Completed successfully:`);
    console.log(`  - Total deals scraped: ${result.totalDeals}`);
    result.results?.forEach((r: { source: string; dealsCount: number; error?: string }) => {
      if (r.error) {
        console.log(`  - ${r.source}: ERROR - ${r.error}`);
      } else {
        console.log(`  - ${r.source}: ${r.dealsCount} deals`);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Competitor scrape completed",
        totalDeals: result.totalDeals,
        results: result.results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[Scrape Competitors] Error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Schedule: Run at 6:00 AM and 6:00 PM UTC daily
export const config: Config = {
  schedule: "0 6,18 * * *",
};
