/**
 * AI System Prompts for Market Intelligence
 */

export const INTELLIGENCE_SYSTEM_PROMPT = `You are a market intelligence assistant for a UK vehicle leasing broker. You help the pricing team understand competitor pricing, market trends, and identify opportunities.

## Your Knowledge Base

You have access to:
1. **Competitor Deals** - Top deals from leasing.com, leaseloco, appliedleasing, selectcarleasing, vipgateway
2. **Our Inventory** - Vehicles and rates from our provider network (Lex, Ogilvie, Venus, Drivalia)
3. **Special Offers** - Currently featured vehicles on our website
4. **Industry Data** - UK car registration statistics and BVRLA market trends

## Your Capabilities

1. **Market Summary** - Provide quick overview of competitor pricing landscape
2. **Price Comparison** - Compare our prices vs competitors for specific vehicles
3. **Gap Analysis** - Identify vehicles competitors have that we're missing
4. **Trend Analysis** - Spot price movements and market trends
5. **Special Offer Suggestions** - Recommend vehicles to feature based on our competitive position
6. **Competitor Assessment** - Evaluate if a competitor deal is a genuine threat or noise

## UK Leasing Context

- PCH = Personal Contract Hire (consumer)
- BCH/CH = Business Contract Hire
- Prices are usually quoted monthly, with initial payment in months (e.g., "3+23" = 3 months upfront + 23 payments)
- Personal prices typically include VAT (PCHNM), business prices usually exclude VAT (CHNM)
- Common terms: 24, 36, 48 months
- Common mileages: 5,000, 8,000, 10,000, 15,000, 20,000 miles/year
- P11D value is the list price + options for company car tax calculations
- Electric vehicles are popular due to 2% BIK tax rate

## Response Style

- Be concise and actionable
- Use GBP (£) for all prices
- Round monthly prices to nearest pound
- When comparing, highlight both opportunities and threats
- If asked about a vehicle we don't stock, suggest alternatives we do have
- Prioritize high score/value and popularity signals over lowest price
- Always consider the mix of special offers (fuel types, body styles, price points)`;

export const SUMMARY_PROMPT = `Analyse the current market data and provide a brief summary covering:

1. **Price Landscape** - Average prices, notable cheap/expensive deals
2. **Popular Vehicles** - What's trending on competitor sites
3. **Electric vs ICE** - Mix of fuel types in top deals
4. **Opportunities** - 2-3 specific vehicles worth investigating
5. **Threats** - Any competitor deals significantly undercutting market

Keep it concise (under 200 words). Use bullet points.`;

export const COMPARISON_PROMPT = (manufacturer: string, model: string) => `
Compare our pricing for ${manufacturer} ${model} against competitor deals.

Include:
- Our best price and terms
- Competitor prices from the data
- Price difference (amount and percentage)
- Assessment: Are we competitive? Should we adjust?
`;

export const SPECIAL_OFFER_PROMPT = `
Based on the current market data and our inventory, suggest 3-5 vehicles to feature as special offers.

Consider:
1. Our competitive advantage (where we beat competitors significantly)
2. Popular vehicles that would attract traffic
3. Mix of price points (budget, mid-range, premium)
4. Mix of fuel types (include EVs for tax benefits)
5. Mix of body styles (hatchback, SUV, saloon)

For each suggestion, explain WHY it should be featured.
`;

export const GAP_ANALYSIS_PROMPT = `
Identify gaps in our offering by comparing competitor deals to our inventory.

Look for:
1. Popular vehicles on competitor sites that we don't have rates for
2. Vehicle segments where we have limited coverage
3. Manufacturers where competitors have better selection

Suggest specific vehicles we should consider adding to our portfolio.
`;

/**
 * Format competitor deals for AI context
 */
export function formatDealsForContext(deals: Array<{
  manufacturer: string;
  model: string;
  variant?: string | null;
  monthlyPriceGbp: number;
  term?: number | null;
  source: string;
  valueScore?: number | null;
  fuelType?: string | null;
  leaseType?: string | null;
  vatIncluded?: boolean | null;
}>): string {
  const dealLines = deals.map((d) => {
    const variant = d.variant ? ` ${d.variant}` : '';
    const term = d.term ? ` (${d.term}mo)` : '';
    const fuel = d.fuelType ? ` [${d.fuelType}]` : '';
    const score = d.valueScore ? ` Score:${d.valueScore}` : '';
    const leaseParts = [];
    if (d.leaseType) leaseParts.push(d.leaseType);
    if (d.vatIncluded !== null && d.vatIncluded !== undefined) {
      leaseParts.push(d.vatIncluded ? 'inc VAT' : 'exc VAT');
    }
    const leaseInfo = leaseParts.length > 0 ? ` [${leaseParts.join(', ')}]` : '';
    return `- ${d.manufacturer} ${d.model}${variant}: £${d.monthlyPriceGbp}/mo${term}${fuel}${leaseInfo}${score} (${d.source})`;
  });

  return dealLines.join('\n');
}

/**
 * Format our rates for AI context
 */
export function formatOurRatesForContext(rates: Array<{
  manufacturer: string;
  model: string;
  variant?: string | null;
  priceGbp: number;
  term: number;
  mileage: number;
  provider: string;
  score?: number | null;
  contractType?: string | null;
}>): string {
  const rateLines = rates.map((r) => {
    const variant = r.variant ? ` ${r.variant}` : '';
    const score = r.score ? ` Score:${r.score}` : '';
    const contract = r.contractType ? `${r.contractType} ` : '';
    return `- ${r.manufacturer} ${r.model}${variant}: £${r.priceGbp}/mo (${contract}${r.term}mo/${r.mileage}mi) via ${r.provider}${score}`;
  });

  return rateLines.join('\n');
}
