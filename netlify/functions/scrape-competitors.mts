import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import * as cheerio from "cheerio";

/**
 * Scheduled function to scrape competitor pricing data
 * Runs twice daily at 6am and 6pm UTC
 */

interface LeasingComDeal {
  Manufacturer: string;
  Range: string;
  DealCount: number;
  ImagePath: string;
  LowestInitialPayment: number;
  MinMonthlyPrice: number;
  MaxLeasingValueScore: number;
  MaxDeliveryTime: number | null;
}

interface ParsedDeal {
  manufacturer: string;
  model: string;
  variant?: string;
  monthlyPrice: number;
  initialPayment?: number;
  term?: number;
  annualMileage?: number;
  imageUrl?: string;
  url?: string;
  leaseType?: string;
  vatIncluded?: boolean;
}

interface FetchResult {
  source: string;
  dealsCount: number;
  error?: string;
}

// ============ LEASING.COM ============
async function fetchLeasingComDeals(): Promise<LeasingComDeal[]> {
  const response = await fetch(
    "https://leasing.com/api/deals/search/popular-manufacturer-ranges/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        searchCriteria: {
          facets: [],
          matches: [
            { matchWith: "Car", fieldName: "vehicleType" },
            { matchWith: "Personal", fieldName: "FinanceType" },
            null, null,
          ],
          ranges: [],
          partialMatches: [],
        },
        pagination: { itemsPerPage: 50, pageNumber: 1 },
        orderBy: { fieldName: "popular", direction: "descending" },
      }),
    }
  );
  if (!response.ok) throw new Error(`Leasing.com error: ${response.status}`);
  const data = await response.json();
  return data.Items || [];
}

// ============ APPLIED LEASING ============
async function fetchAppliedLeasingDeals(): Promise<ParsedDeal[]> {
  const response = await fetch("https://www.appliedleasing.co.uk/car-leasing", {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
  });
  if (!response.ok) throw new Error(`Applied Leasing error: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const deals: ParsedDeal[] = [];

  $(".vehicle-card, .deal-card, [class*='vehicle']").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h2, h3, .title, .vehicle-title").first().text().trim();
    const priceText = $el.find("[class*='price'], .monthly-price").first().text();
    const priceMatch = priceText.match(/£?([\d,]+(?:\.\d{2})?)/);

    if (title && priceMatch) {
      const parts = title.split(/\s+/);
      const manufacturer = parts[0] || "";
      const model = parts.slice(1, 3).join(" ") || "";
      deals.push({
        manufacturer,
        model,
        monthlyPrice: parseFloat(priceMatch[1].replace(",", "")),
        imageUrl: $el.find("img").first().attr("src"),
        url: $el.find("a").first().attr("href"),
        leaseType: "business",
        vatIncluded: false,
      });
    }
  });

  return deals;
}

// ============ SELECT CAR LEASING ============
async function fetchSelectCarLeasingDeals(): Promise<ParsedDeal[]> {
  const response = await fetch("https://www.selectcarleasing.co.uk/special-offers", {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
  });
  if (!response.ok) throw new Error(`Select Car Leasing error: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const deals: ParsedDeal[] = [];

  $(".offer-card, .vehicle-card, [class*='offer']").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h2, h3, .title").first().text().trim();
    const priceText = $el.find("[class*='price']").first().text();
    const priceMatch = priceText.match(/£?([\d,]+(?:\.\d{2})?)/);

    if (title && priceMatch) {
      const parts = title.split(/\s+/);
      deals.push({
        manufacturer: parts[0] || "",
        model: parts.slice(1, 3).join(" ") || "",
        monthlyPrice: parseFloat(priceMatch[1].replace(",", "")),
        imageUrl: $el.find("img").first().attr("src"),
        leaseType: "personal",
        vatIncluded: true,
      });
    }
  });

  return deals;
}

// ============ VIP GATEWAY ============
async function fetchVipGatewayDeals(): Promise<ParsedDeal[]> {
  const response = await fetch("https://vipgateway.co.uk/special-car-leasing-offers", {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
  });
  if (!response.ok) throw new Error(`VIP Gateway error: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const deals: ParsedDeal[] = [];

  $(".vehicle-card, .offer-item, [class*='vehicle']").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h2, h3, .title").first().text().trim();
    const priceText = $el.find("[class*='price']").first().text();
    const priceMatch = priceText.match(/£?([\d,]+(?:\.\d{2})?)/);

    if (title && priceMatch) {
      const parts = title.split(/\s+/);
      deals.push({
        manufacturer: parts[0] || "",
        model: parts.slice(1, 3).join(" ") || "",
        monthlyPrice: parseFloat(priceMatch[1].replace(",", "")),
        imageUrl: $el.find("img").first().attr("src"),
        leaseType: "business",
        vatIncluded: false,
      });
    }
  });

  return deals;
}

// ============ MAIN HANDLER ============
export default async function handler(req: Request, context: Context) {
  const startTime = Date.now();
  console.log(`[Scrape Competitors] Starting at ${new Date().toISOString()}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "DATABASE_URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const sql = neon(databaseUrl);
  const results: FetchResult[] = [];

  // Helper to store deals
  async function storeDeals(source: string, deals: ParsedDeal[], isLeasingCom = false) {
    if (deals.length === 0) return;

    const prices = deals.map(d => Math.round(d.monthlyPrice * 100));
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    const [snapshot] = await sql`
      INSERT INTO market_intelligence_snapshots (source, total_deals_count, avg_monthly_price, price_range, raw_data)
      VALUES (${source}, ${deals.length}, ${avgPrice}, ${JSON.stringify({ min: Math.min(...prices), max: Math.max(...prices) })}, ${JSON.stringify({ fetchedAt: new Date().toISOString() })})
      RETURNING id
    `;

    for (const deal of deals) {
      const externalId = `${deal.manufacturer}-${deal.model}`.toLowerCase().replace(/\s+/g, '-');
      const monthlyPrice = Math.round(deal.monthlyPrice * 100);

      // Try to match CAP code
      const matchResult = await sql`
        SELECT cap_code FROM vehicles
        WHERE LOWER(manufacturer) = LOWER(${deal.manufacturer})
          AND LOWER(model) LIKE LOWER(${deal.model.split(' ')[0] + '%'})
        LIMIT 1
      `;

      await sql`
        INSERT INTO market_intelligence_deals (
          snapshot_id, source, external_id, manufacturer, model,
          monthly_price, initial_payment, term, annual_mileage,
          image_url, lease_type, vat_included, matched_cap_code, raw_data
        ) VALUES (
          ${snapshot.id}, ${source}, ${externalId}, ${deal.manufacturer}, ${deal.model},
          ${monthlyPrice}, ${deal.initialPayment ? Math.round(deal.initialPayment * 100) : null},
          ${deal.term || null}, ${deal.annualMileage || null},
          ${deal.imageUrl || null}, ${deal.leaseType || null}, ${deal.vatIncluded ?? null},
          ${matchResult[0]?.cap_code || null}, ${JSON.stringify(deal)}
        )
      `;
    }

    console.log(`[Scrape Competitors] ${source}: stored ${deals.length} deals`);
  }

  // 1. Leasing.com
  try {
    console.log("[Scrape Competitors] Fetching Leasing.com...");
    const lcDeals = await fetchLeasingComDeals();
    const normalized = lcDeals.map(d => ({
      manufacturer: d.Manufacturer,
      model: d.Range,
      monthlyPrice: d.MinMonthlyPrice,
      initialPayment: d.LowestInitialPayment,
      imageUrl: d.ImagePath,
      leaseType: "personal" as const,
      vatIncluded: true,
    }));
    await storeDeals("leasing_com", normalized);
    results.push({ source: "leasing_com", dealsCount: normalized.length });
  } catch (error) {
    console.error("[Scrape Competitors] Leasing.com error:", error);
    results.push({ source: "leasing_com", dealsCount: 0, error: String(error) });
  }

  // 2. Applied Leasing
  try {
    console.log("[Scrape Competitors] Fetching Applied Leasing...");
    const deals = await fetchAppliedLeasingDeals();
    await storeDeals("appliedleasing", deals);
    results.push({ source: "appliedleasing", dealsCount: deals.length });
  } catch (error) {
    console.error("[Scrape Competitors] Applied Leasing error:", error);
    results.push({ source: "appliedleasing", dealsCount: 0, error: String(error) });
  }

  // 3. Select Car Leasing
  try {
    console.log("[Scrape Competitors] Fetching Select Car Leasing...");
    const deals = await fetchSelectCarLeasingDeals();
    await storeDeals("selectcarleasing", deals);
    results.push({ source: "selectcarleasing", dealsCount: deals.length });
  } catch (error) {
    console.error("[Scrape Competitors] Select Car Leasing error:", error);
    results.push({ source: "selectcarleasing", dealsCount: 0, error: String(error) });
  }

  // 4. VIP Gateway
  try {
    console.log("[Scrape Competitors] Fetching VIP Gateway...");
    const deals = await fetchVipGatewayDeals();
    await storeDeals("vipgateway", deals);
    results.push({ source: "vipgateway", dealsCount: deals.length });
  } catch (error) {
    console.error("[Scrape Competitors] VIP Gateway error:", error);
    results.push({ source: "vipgateway", dealsCount: 0, error: String(error) });
  }

  const duration = Date.now() - startTime;
  const totalDeals = results.reduce((sum, r) => sum + r.dealsCount, 0);

  console.log(`[Scrape Competitors] Completed in ${duration}ms - ${totalDeals} total deals`);

  return new Response(
    JSON.stringify({ success: true, results, totalDeals, duration: `${duration}ms` }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export const config: Config = {
  schedule: "0 6,18 * * *",
};
