import type { Config, Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import * as cheerio from "cheerio";

/**
 * Scheduled function to scrape competitor pricing data
 * Runs twice daily at 6am and 6pm UTC
 */

interface LeasingComDeal {
  manufacturer: string;
  model: string;
  variant: string | null;
  monthlyPrice: number;
  initialPayment: number | null;
  term: number | null;
  annualMileage: number | null;
  imageUrl: string | null;
  url: string | null;
  leaseType: string;
  vatIncluded: boolean;
}

interface ParsedDeal {
  manufacturer: string | null;
  model: string | null;
  variant?: string | null;
  monthlyPrice: number | null;
  initialPayment?: number | null;
  term?: number | null;
  annualMileage?: number | null;
  imageUrl?: string | null;
  url?: string | null;
  leaseType?: string | null;
  vatIncluded?: boolean | null;
}

interface FetchResult {
  source: string;
  dealsCount: number;
  error?: string;
}

// ============ HELPERS ============
const moneyToNumber = (text: string | null | undefined) => {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  return Number.parseFloat(cleaned);
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const slugToTitle = (slug: string | null | undefined) => {
  if (!slug) return null;
  return slug.split("-").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
};

const buildAbsoluteUrl = (href: string | null | undefined, base: string) => {
  if (!href) return null;
  try { return new URL(href, base).toString(); } catch { return null; }
};

const getPathParts = (href: string | null | undefined, base: string) => {
  const absolute = buildAbsoluteUrl(href, base);
  if (!absolute) return [];
  try { return new URL(absolute).pathname.split("/").filter(Boolean); } catch { return []; }
};

const parseTermMileage = (text: string) => {
  const termMatch = text.match(/(\d+)\s*months?/i);
  const mileageMatch = text.match(/([0-9,]+)\s*miles/i);
  return {
    term: termMatch ? Number.parseInt(termMatch[1], 10) : null,
    mileage: mileageMatch ? Number.parseInt(mileageMatch[1].replace(/,/g, ""), 10) : null,
  };
};

const parseVatIncluded = (text: string) => {
  if (/inc\.?\s*vat/i.test(text)) return true;
  if (/(\+|\bexc\.?)\s*vat/i.test(text)) return false;
  return null;
};

// ============ LEASING.COM ============
async function fetchLeasingComDeals(): Promise<LeasingComDeal[]> {
  console.log("[Leasing.com] Starting fetch from special-offers pages...");
  const allDeals: LeasingComDeal[] = [];

  // Fetch pages 1, 2, and 3 of special offers
  const urls = [
    "https://leasing.com/special-offers/",
    "https://leasing.com/special-offers/page2/?sort=value",
    "https://leasing.com/special-offers/page3/?sort=value",
  ];

  for (const url of urls) {
    try {
      console.log(`[Leasing.com] Fetching ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
        },
      });

      if (!response.ok) {
        console.log(`[Leasing.com] ${url} returned ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`[Leasing.com] ${url} HTML length: ${html.length}`);
      const $ = cheerio.load(html);

      // Find deal cards - adjust selectors based on actual page structure
      const cards = $("article, .deal-card, [data-deal], .vehicle-card, .offer-card").add($("a[href*='/car-leasing/']").closest("div, article"));
      console.log(`[Leasing.com] Found ${cards.length} potential cards on ${url}`);

      cards.each((_, el) => {
        try {
          // Try to extract deal info from various possible structures
          const $el = $(el);

          // Look for manufacturer/model in title or heading
          const titleText = $el.find("h2, h3, .title, .vehicle-name, .make-model").first().text().trim();
          const linkHref = $el.find("a[href*='/car-leasing/']").first().attr("href") || $el.attr("href");

          // Extract manufacturer and model from URL path or title
          let manufacturer: string | null = null;
          let model: string | null = null;

          if (linkHref) {
            const pathMatch = linkHref.match(/\/car-leasing\/([^\/]+)\/([^\/]+)/);
            if (pathMatch) {
              manufacturer = slugToTitle(pathMatch[1]);
              model = slugToTitle(pathMatch[2]);
            }
          }

          if (!manufacturer && titleText) {
            const parts = titleText.split(/\s+/);
            if (parts.length >= 2) {
              manufacturer = parts[0];
              model = parts.slice(1).join(" ");
            }
          }

          // Look for price - various selectors
          const priceText = $el.find(".price, .monthly-price, [class*='price'], .cost").first().text();
          const monthlyPrice = moneyToNumber(priceText);

          // Look for variant/trim
          const variant = $el.find(".variant, .trim, .subtitle, .derivative").first().text().trim() || null;

          // Look for image
          const imgSrc = $el.find("img").first().attr("src");
          const imageUrl = imgSrc ? buildAbsoluteUrl(imgSrc, "https://leasing.com") : null;

          // Look for term/mileage
          const detailsText = $el.text();
          const { term, mileage } = parseTermMileage(detailsText);

          // Look for initial payment
          const initialMatch = detailsText.match(/initial[^£]*£([0-9,.]+)/i);
          const initialPayment = initialMatch ? moneyToNumber(initialMatch[1]) : null;

          // Determine lease type from text
          const leaseType = /business/i.test(detailsText) ? "business" : "personal";
          const vatIncluded = parseVatIncluded(detailsText) ?? true;

          if (manufacturer && model && monthlyPrice && monthlyPrice > 50) {
            allDeals.push({
              manufacturer,
              model,
              variant,
              monthlyPrice,
              initialPayment,
              term,
              annualMileage: mileage,
              imageUrl,
              url: linkHref ? buildAbsoluteUrl(linkHref, "https://leasing.com") : null,
              leaseType,
              vatIncluded,
            });
          }
        } catch (e) {
          // Skip malformed cards
        }
      });
    } catch (error) {
      console.error(`[Leasing.com] Error fetching ${url}:`, error);
    }
  }

  console.log(`[Leasing.com] Total deals scraped: ${allDeals.length}`);
  return allDeals;
}

// ============ APPLIED LEASING ============
async function fetchAppliedLeasingDeals(): Promise<ParsedDeal[]> {
  console.log("[Applied Leasing] Starting fetch...");
  const response = await fetch("https://www.appliedleasing.co.uk/car-leasing", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
  });
  console.log(`[Applied Leasing] Response status: ${response.status}`);
  if (!response.ok) throw new Error(`Applied Leasing error: ${response.status}`);

  const html = await response.text();
  console.log(`[Applied Leasing] HTML length: ${html.length}`);
  const $ = cheerio.load(html);
  const dlitems = $(".dlitem");
  console.log(`[Applied Leasing] Found .dlitem elements: ${dlitems.length}`);
  const deals: ParsedDeal[] = [];

  dlitems.each((_, el) => {
    const href = $(el).find("a.deallink, a.layer").first().attr("href");
    const url = buildAbsoluteUrl(href, "https://www.appliedleasing.co.uk");
    const variant = normalizeWhitespace($(el).find(".title-2 .t2").first().text());
    const term = Number.parseInt(normalizeWhitespace($(el).find(".conlen").first().text()), 10) || null;
    const annualMileage = Number.parseInt(normalizeWhitespace($(el).find(".mpa").first().text()).replace(/,/g, ""), 10) || null;
    const imageSrc = $(el).find("img.vehimg").first().attr("src");
    const imageUrl = buildAbsoluteUrl(imageSrc, "https://www.appliedleasing.co.uk");

    let manufacturer: string | null = null;
    let model: string | null = null;
    const pathParts = getPathParts(href, "https://www.appliedleasing.co.uk");
    if (pathParts.length >= 3) {
      manufacturer = slugToTitle(pathParts[1]);
      model = slugToTitle(pathParts[2]);
    }

    $(el).find(".price-dual-1 > div").each((__, priceCol) => {
      const leaseLabel = normalizeWhitespace($(priceCol).find(".title").first().text());
      const priceText = normalizeWhitespace($(priceCol).find(".price").first().text());
      const vatText = normalizeWhitespace($(priceCol).find(".vspm").first().text());
      const initialText = normalizeWhitespace($(priceCol).find(".initpay").first().text());

      deals.push({
        manufacturer,
        model,
        variant: variant || null,
        monthlyPrice: moneyToNumber(priceText),
        initialPayment: moneyToNumber(initialText),
        term,
        annualMileage,
        url,
        imageUrl,
        leaseType: /business/i.test(leaseLabel) ? "business" : "personal",
        vatIncluded: parseVatIncluded(vatText),
      });
    });
  });

  return deals;
}

// ============ SELECT CAR LEASING ============
async function fetchSelectCarLeasingDeals(): Promise<ParsedDeal[]> {
  console.log("[Select Car Leasing] Starting fetch...");
  const response = await fetch("https://www.selectcarleasing.co.uk/special-offers", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
  });
  console.log(`[Select Car Leasing] Response status: ${response.status}`);
  if (!response.ok) throw new Error(`Select Car Leasing error: ${response.status}`);

  const html = await response.text();
  console.log(`[Select Car Leasing] HTML length: ${html.length}`);
  const $ = cheerio.load(html);
  const cards = $("article.drv-car-card");
  console.log(`[Select Car Leasing] Found article.drv-car-card: ${cards.length}`);
  const deals: ParsedDeal[] = [];

  cards.each((_, el) => {
    const manufacturer = $(el).attr("data-ga-car-card-item-brand")?.trim() || null;
    const model = $(el).attr("data-ga-car-card-item-name")?.trim() || null;
    const variant = $(el).attr("data-ga-car-card-item-variant")?.trim() ||
      normalizeWhitespace($(el).find(".drv-car-card__subtitle").first().text()) || null;
    const href = $(el).find("a.drv-car-card__link").first().attr("href");
    const url = buildAbsoluteUrl(href, "https://www.selectcarleasing.co.uk");

    const offer = $(el).find(".drv-card-car__offer").first();
    const leftText = normalizeWhitespace(offer.find(".drv-card-car__split").first().text());
    const rightText = normalizeWhitespace(offer.find(".drv-card-car__split").eq(1).text());
    const priceText = normalizeWhitespace(offer.find(".drv-card-car__text-price").first().text());
    const initialMatch = leftText.match(/Initial payment:\s*£[0-9,.]+/i);
    const { term, mileage } = parseTermMileage(leftText);

    deals.push({
      manufacturer,
      model,
      variant,
      monthlyPrice: moneyToNumber(priceText),
      initialPayment: moneyToNumber(initialMatch?.[0]),
      term,
      annualMileage: mileage,
      url,
      imageUrl: null,
      leaseType: "personal",
      vatIncluded: parseVatIncluded(rightText),
    });
  });

  return deals;
}

// ============ VIP GATEWAY ============
async function fetchVipGatewayDeals(): Promise<ParsedDeal[]> {
  console.log("[VIP Gateway] Starting fetch...");
  const response = await fetch("https://vipgateway.co.uk/special-car-leasing-offers", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    },
  });
  console.log(`[VIP Gateway] Response status: ${response.status}`);
  if (!response.ok) throw new Error(`VIP Gateway error: ${response.status}`);

  const html = await response.text();
  console.log(`[VIP Gateway] HTML length: ${html.length}`);
  const $ = cheerio.load(html);
  const cards = $("a[data-cms-card]");
  console.log(`[VIP Gateway] Found a[data-cms-card]: ${cards.length}`);
  const deals: ParsedDeal[] = [];

  cards.each((_, el) => {
    const href = $(el).attr("href");
    const url = buildAbsoluteUrl(href, "https://vipgateway.co.uk");
    const variant = normalizeWhitespace($(el).find("span.text-center.text-gray-700").first().text());
    const imageSrc = $(el).find("img").first().attr("src");
    const imageUrl = buildAbsoluteUrl(imageSrc, "https://vipgateway.co.uk");

    let manufacturer: string | null = null;
    let model: string | null = null;
    const pathParts = getPathParts(href, "https://vipgateway.co.uk");
    if (pathParts.length >= 3) {
      manufacturer = slugToTitle(pathParts[1]);
      model = slugToTitle(pathParts[2]);
    }

    $(el).find("div.border-t.py-2").each((__, block) => {
      const leaseLabel = normalizeWhitespace($(block).find("p.font-medium").first().text());
      const termMileageText = normalizeWhitespace($(block).find("p.text-xs").first().text());
      const priceText = normalizeWhitespace($(block).find("p.text-2xl").first().text());
      const initialText = normalizeWhitespace($(block).find("p.text-xs").last().text());
      const { term, mileage } = parseTermMileage(termMileageText);

      deals.push({
        manufacturer,
        model,
        variant: variant || null,
        monthlyPrice: moneyToNumber(priceText),
        initialPayment: moneyToNumber(initialText),
        term,
        annualMileage: mileage,
        url,
        imageUrl,
        leaseType: /business/i.test(leaseLabel) ? "business" : "personal",
        vatIncluded: parseVatIncluded(priceText),
      });
    });
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

  // Helper to store deals (limited to top 30 per source to avoid timeout)
  async function storeDeals(source: string, deals: ParsedDeal[]) {
    const validDeals = deals
      .filter(d => d.manufacturer && d.model && d.monthlyPrice)
      .slice(0, 30); // Keep original website ordering, limit to 30

    if (validDeals.length === 0) {
      console.log(`[Scrape Competitors] ${source}: no valid deals found`);
      return 0;
    }
    console.log(`[Scrape Competitors] ${source}: storing top ${validDeals.length} deals`);

    const prices = validDeals.map(d => Math.round(d.monthlyPrice! * 100));
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    const [snapshot] = await sql`
      INSERT INTO market_intelligence_snapshots (source, total_deals_count, avg_monthly_price, price_range, raw_data)
      VALUES (${source}, ${validDeals.length}, ${avgPrice}, ${JSON.stringify({ min: Math.min(...prices), max: Math.max(...prices) })}, ${JSON.stringify({ fetchedAt: new Date().toISOString() })})
      RETURNING id
    `;

    for (const deal of validDeals) {
      const externalId = `${deal.manufacturer}-${deal.model}`.toLowerCase().replace(/\s+/g, '-');
      const monthlyPrice = Math.round(deal.monthlyPrice! * 100);

      // Try to match CAP code
      const matchResult = await sql`
        SELECT cap_code FROM vehicles
        WHERE LOWER(manufacturer) = LOWER(${deal.manufacturer})
          AND LOWER(model) LIKE LOWER(${(deal.model || '').split(' ')[0] + '%'})
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

    console.log(`[Scrape Competitors] ${source}: stored ${validDeals.length} deals`);
    return validDeals.length;
  }

  // 1. Leasing.com (special offers pages)
  try {
    console.log("[Scrape Competitors] Fetching Leasing.com special offers...");
    const lcDeals = await fetchLeasingComDeals();
    const normalized: ParsedDeal[] = lcDeals.map(d => ({
      manufacturer: d.manufacturer,
      model: d.model,
      variant: d.variant,
      monthlyPrice: d.monthlyPrice,
      initialPayment: d.initialPayment,
      term: d.term,
      annualMileage: d.annualMileage,
      imageUrl: d.imageUrl,
      url: d.url,
      leaseType: d.leaseType,
      vatIncluded: d.vatIncluded,
    }));
    console.log(`[Scrape Competitors] Leasing.com raw: ${normalized.length} deals`);
    const count = await storeDeals("leasing_com", normalized);
    results.push({ source: "leasing_com", dealsCount: count });
  } catch (error) {
    console.error("[Scrape Competitors] Leasing.com error:", error);
    results.push({ source: "leasing_com", dealsCount: 0, error: String(error) });
  }

  // 2. Applied Leasing
  try {
    console.log("[Scrape Competitors] Fetching Applied Leasing...");
    const deals = await fetchAppliedLeasingDeals();
    console.log(`[Scrape Competitors] Applied Leasing raw: ${deals.length} deals`);
    const count = await storeDeals("appliedleasing", deals);
    results.push({ source: "appliedleasing", dealsCount: count });
  } catch (error) {
    console.error("[Scrape Competitors] Applied Leasing error:", error);
    results.push({ source: "appliedleasing", dealsCount: 0, error: String(error) });
  }

  // 3. Select Car Leasing
  try {
    console.log("[Scrape Competitors] Fetching Select Car Leasing...");
    const deals = await fetchSelectCarLeasingDeals();
    console.log(`[Scrape Competitors] Select Car Leasing raw: ${deals.length} deals`);
    const count = await storeDeals("selectcarleasing", deals);
    results.push({ source: "selectcarleasing", dealsCount: count });
  } catch (error) {
    console.error("[Scrape Competitors] Select Car Leasing error:", error);
    results.push({ source: "selectcarleasing", dealsCount: 0, error: String(error) });
  }

  // 4. VIP Gateway
  try {
    console.log("[Scrape Competitors] Fetching VIP Gateway...");
    const deals = await fetchVipGatewayDeals();
    console.log(`[Scrape Competitors] VIP Gateway raw: ${deals.length} deals`);
    const count = await storeDeals("vipgateway", deals);
    results.push({ source: "vipgateway", dealsCount: count });
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
