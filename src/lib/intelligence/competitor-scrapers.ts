import * as cheerio from "cheerio";

export type LeaseType = "personal" | "business";

export type ParsedCompetitorDeal = {
  source: string;
  leaseType: LeaseType | null;
  vatIncluded: boolean | null;
  monthlyPrice: number | null;
  initialPayment: number | null;
  term: number | null;
  annualMileage: number | null;
  manufacturer: string | null;
  model: string | null;
  variant: string | null;
  url: string | null;
  imageUrl: string | null;
};

const moneyToNumber = (text: string | null | undefined) => {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  return Number.parseFloat(cleaned);
};

const parseTermMileage = (text: string) => {
  const termMatch = text.match(/(\d+)\s*months?/i);
  const mileageMatch = text.match(/([0-9,]+)\s*miles/i);
  return {
    term: termMatch ? Number.parseInt(termMatch[1], 10) : null,
    mileage: mileageMatch ? Number.parseInt(mileageMatch[1].replace(/,/g, ""), 10) : null,
  };
};

const slugToTitle = (slug: string | null | undefined) => {
  if (!slug) return null;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const buildAbsoluteUrl = (href: string | null | undefined, base: string) => {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
};

const getPathParts = (href: string | null | undefined, base: string) => {
  const absolute = buildAbsoluteUrl(href, base);
  if (!absolute) return [];
  try {
    return new URL(absolute).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
};

const parseVatIncluded = (text: string) => {
  if (/inc\.?\s*vat/i.test(text)) return true;
  if (/(\+|\bexc\.?)\s*vat/i.test(text)) return false;
  return null;
};

export function parseAppliedLeasingDeals(html: string): ParsedCompetitorDeal[] {
  const $ = cheerio.load(html);
  const deals: ParsedCompetitorDeal[] = [];

  $(".dlitem").each((_, el) => {
    const href = $(el).find("a.deallink, a.layer").first().attr("href");
    const url = buildAbsoluteUrl(href, "https://www.appliedleasing.co.uk");
    const title = normalizeWhitespace($(el).find(".title-2 .t1").first().text());
    const variant = normalizeWhitespace($(el).find(".title-2 .t2").first().text());
    const term = Number.parseInt(
      normalizeWhitespace($(el).find(".conlen").first().text()),
      10
    ) || null;
    const annualMileage = Number.parseInt(
      normalizeWhitespace($(el).find(".mpa").first().text()).replace(/,/g, ""),
      10
    ) || null;
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
        source: "appliedleasing",
        leaseType: /business/i.test(leaseLabel) ? "business" : "personal",
        vatIncluded: parseVatIncluded(vatText),
        monthlyPrice: moneyToNumber(priceText),
        initialPayment: moneyToNumber(initialText),
        term,
        annualMileage,
        manufacturer,
        model,
        variant: variant || null,
        url,
        imageUrl,
      });
    });
  });

  return deals;
}

export function parseSelectCarLeasingDeals(html: string): ParsedCompetitorDeal[] {
  const $ = cheerio.load(html);
  const deals: ParsedCompetitorDeal[] = [];

  $("article.drv-car-card").each((_, el) => {
    const manufacturer = $(el).attr("data-ga-car-card-item-brand")?.trim() || null;
    const model = $(el).attr("data-ga-car-card-item-name")?.trim() || null;
    const variant =
      $(el).attr("data-ga-car-card-item-variant")?.trim() ||
      normalizeWhitespace($(el).find(".drv-car-card__subtitle").first().text()) ||
      null;
    const href = $(el).find("a.drv-car-card__link").first().attr("href");
    const url = buildAbsoluteUrl(href, "https://www.selectcarleasing.co.uk");

    const offer = $(el).find(".drv-card-car__offer").first();
    const leftText = normalizeWhitespace(offer.find(".drv-card-car__split").first().text());
    const rightText = normalizeWhitespace(offer.find(".drv-card-car__split").eq(1).text());
    const priceText = normalizeWhitespace(offer.find(".drv-card-car__text-price").first().text());
    const initialMatch = leftText.match(/Initial payment:\s*£[0-9,.]+/i);
    const { term, mileage } = parseTermMileage(leftText);

    deals.push({
      source: "selectcarleasing",
      leaseType: "personal",
      vatIncluded: parseVatIncluded(rightText),
      monthlyPrice: moneyToNumber(priceText),
      initialPayment: moneyToNumber(initialMatch?.[0]),
      term,
      annualMileage: mileage,
      manufacturer: manufacturer || null,
      model: model || null,
      variant,
      url,
      imageUrl: null,
    });
  });

  return deals;
}

export function parseVipGatewayDeals(html: string): ParsedCompetitorDeal[] {
  const $ = cheerio.load(html);
  const deals: ParsedCompetitorDeal[] = [];

  $("a[data-cms-card]").each((_, el) => {
    const href = $(el).attr("href");
    const url = buildAbsoluteUrl(href, "https://vipgateway.co.uk");
    const vehicleTitle = normalizeWhitespace($(el).find("span.text-xl").first().text());
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
        source: "vipgateway",
        leaseType: /business/i.test(leaseLabel) ? "business" : "personal",
        vatIncluded: parseVatIncluded(priceText),
        monthlyPrice: moneyToNumber(priceText),
        initialPayment: moneyToNumber(initialText),
        term,
        annualMileage: mileage,
        manufacturer,
        model,
        variant: variant || null,
        url,
        imageUrl,
      });
    });
  });

  return deals;
}

export async function fetchAppliedLeasingDeals(): Promise<ParsedCompetitorDeal[]> {
  const response = await fetch("https://www.appliedleasing.co.uk/car-leasing", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      Accept: "text/html",
      Referer: "https://www.appliedleasing.co.uk/car-leasing",
    },
  });

  if (!response.ok) {
    throw new Error(`Applied Leasing fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return parseAppliedLeasingDeals(html);
}

export async function fetchSelectCarLeasingDeals(): Promise<ParsedCompetitorDeal[]> {
  const response = await fetch("https://www.selectcarleasing.co.uk/special-offers", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      Accept: "text/html",
      Referer: "https://www.selectcarleasing.co.uk/special-offers",
    },
  });

  if (!response.ok) {
    throw new Error(`Select Car Leasing fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return parseSelectCarLeasingDeals(html);
}

export async function fetchVipGatewayDeals(): Promise<ParsedCompetitorDeal[]> {
  const response = await fetch("https://vipgateway.co.uk/special-car-leasing-offers", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      Accept: "text/html",
      Referer: "https://vipgateway.co.uk/special-car-leasing-offers",
    },
  });

  if (!response.ok) {
    throw new Error(`VIP Gateway fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return parseVipGatewayDeals(html);
}
