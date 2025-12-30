/**
 * AI Analyzer for Market Intelligence
 * Uses OpenAI to generate insights from market data
 */

import OpenAI from 'openai';
import { db } from '@/lib/db';
import {
  marketIntelligenceDeals,
  marketIntelligenceSnapshots,
  providerRates,
  ratebookImports,
  vehicleStatus,
  vehicles,
  featuredDeals,
} from '@/lib/db/schema';
import { eq, desc, and, inArray, gt, sql } from 'drizzle-orm';
import {
  INTELLIGENCE_SYSTEM_PROMPT,
  SUMMARY_PROMPT,
  formatDealsForContext,
  formatOurRatesForContext,
  formatSmartSuggestionsForContext,
  formatFunderPerformanceForContext,
  formatFeaturedPerformanceForContext,
} from './prompts';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface MarketContext {
  competitorDeals: Array<{
    manufacturer: string;
    model: string;
    variant: string | null;
    monthlyPriceGbp: number;
    term: number | null;
    source: string;
    valueScore: number | null;
    fuelType: string | null;
    leaseType: string | null;
    vatIncluded: boolean | null;
  }>;
  ourBestRates: Array<{
    manufacturer: string;
    model: string;
    variant: string | null;
    priceGbp: number;
    term: number;
    mileage: number;
    provider: string;
    score: number | null;
    contractType: string;
  }>;
  specialOffers: Array<{
    manufacturer: string;
    model: string;
  }>;
  snapshotDates: Record<string, Date | null>;
  // New pricing intelligence data
  smartSuggestions: Array<{
    manufacturer: string;
    model: string;
    priceGbp: number;
    marketAvgGbp: number | null;
    priceDelta: number | null;
    score: number;
    confidence: number;
    reasons: string[];
  }>;
  funderPerformance: Array<{
    funder: string;
    bestPriceCount: number;
    totalRates: number;
    avgScore: number;
    daysSinceImport: number;
  }>;
  featuredPerformance: Array<{
    manufacturer: string;
    model: string;
    views: number;
    enquiries: number;
    conversionRate: number;
    daysLive: number;
  }>;
  coverageGaps: Array<{
    manufacturer: string;
    model: string;
    missingFunders: string[];
  }>;
}

/**
 * Build context from latest market data
 */
export async function buildMarketContext(): Promise<MarketContext> {
  const competitorSources = [
    'leasing_com',
    'leaseloco',
    'appliedleasing',
    'selectcarleasing',
    'vipgateway',
  ];

  const latestSnapshots = await Promise.all(
    competitorSources.map(async (source) => {
      const snapshot = await db
        .select()
        .from(marketIntelligenceSnapshots)
        .where(eq(marketIntelligenceSnapshots.source, source))
        .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
        .limit(1);
      return { source, snapshot: snapshot[0] ?? null };
    })
  );

  const snapshotIds = latestSnapshots
    .map((entry) => entry.snapshot?.id)
    .filter(Boolean) as string[];

  // Get competitor deals
  const competitorDeals = snapshotIds.length > 0
    ? await db
        .select()
        .from(marketIntelligenceDeals)
        .where(inArray(marketIntelligenceDeals.snapshotId, snapshotIds))
    : [];

  // Get our best rates (one per vehicle, best price)
  const ourRates = await db
    .select({
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
      variant: providerRates.variant,
      totalRental: providerRates.totalRental,
      term: providerRates.term,
      annualMileage: providerRates.annualMileage,
      providerCode: providerRates.providerCode,
      score: providerRates.score,
      contractType: providerRates.contractType,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(eq(ratebookImports.isLatest, true))
    .orderBy(desc(providerRates.score), providerRates.totalRental)
    .limit(100);

  // Get special offers
  const specialOffers = await db
    .select({
      manufacturer: vehicles.manufacturer,
      model: vehicles.model,
    })
    .from(vehicleStatus)
    .innerJoin(vehicles, eq(vehicleStatus.vehicleId, vehicles.id))
    .where(eq(vehicleStatus.isSpecialOffer, true));

  const snapshotDates = latestSnapshots.reduce<Record<string, Date | null>>(
    (acc, entry) => {
      acc[entry.source] = entry.snapshot?.snapshotDate ?? null;
      return acc;
    },
    {}
  );

  // Fetch smart suggestions data (high-score deals not yet featured)
  const highScoreDeals = await db
    .select({
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
      minPrice: sql<number>`min(${providerRates.totalRental})::int`,
      maxScore: sql<number>`max(${providerRates.score})::int`,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(and(eq(ratebookImports.isLatest, true), gt(providerRates.score, 80)))
    .groupBy(providerRates.manufacturer, providerRates.model)
    .orderBy(desc(sql`max(${providerRates.score})`))
    .limit(20);

  // Fetch funder performance metrics
  const funderStats = await db
    .select({
      provider: providerRates.providerCode,
      totalRates: sql<number>`count(*)::int`,
      avgScore: sql<number>`avg(${providerRates.score})::int`,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(eq(ratebookImports.isLatest, true))
    .groupBy(providerRates.providerCode);

  // Fetch featured deals performance
  const featuredStats = await db
    .select({
      manufacturer: featuredDeals.manufacturer,
      model: featuredDeals.model,
      views: featuredDeals.views,
      enquiries: featuredDeals.enquiries,
      featuredAt: featuredDeals.featuredAt,
    })
    .from(featuredDeals)
    .where(eq(featuredDeals.isActive, true))
    .orderBy(desc(featuredDeals.views))
    .limit(10);

  const now = new Date();

  return {
    competitorDeals: competitorDeals.map((d) => ({
      manufacturer: d.manufacturer,
      model: d.model,
      variant: d.variant,
      monthlyPriceGbp: Math.round(d.monthlyPrice / 100),
      term: d.term,
      source: d.source,
      valueScore: d.valueScore,
      fuelType: d.fuelType,
      leaseType: d.leaseType,
      vatIncluded: d.vatIncluded,
    })),
    ourBestRates: ourRates.map((r) => ({
      manufacturer: r.manufacturer,
      model: r.model,
      variant: r.variant,
      priceGbp: Math.round(r.totalRental / 100),
      term: r.term,
      mileage: r.annualMileage,
      provider: r.providerCode,
      score: r.score,
      contractType: r.contractType,
    })),
    specialOffers,
    snapshotDates,
    smartSuggestions: highScoreDeals.map((d) => ({
      manufacturer: d.manufacturer,
      model: d.model,
      priceGbp: Math.round(d.minPrice / 100),
      marketAvgGbp: null, // Would need market data join
      priceDelta: null,
      score: d.maxScore,
      confidence: d.maxScore >= 90 ? 85 : 70,
      reasons: d.maxScore >= 90 ? ['exceptional_value'] : ['high_score'],
    })),
    funderPerformance: funderStats.map((f) => ({
      funder: f.provider,
      bestPriceCount: 0, // Would need additional query
      totalRates: f.totalRates,
      avgScore: f.avgScore || 0,
      daysSinceImport: 0, // Would need additional query
    })),
    featuredPerformance: featuredStats.map((f) => {
      const daysLive = Math.max(1, Math.ceil((now.getTime() - f.featuredAt.getTime()) / (1000 * 60 * 60 * 24)));
      const views = f.views || 0;
      const enquiries = f.enquiries || 0;
      return {
        manufacturer: f.manufacturer,
        model: f.model,
        views,
        enquiries,
        conversionRate: views > 0 ? Math.round((enquiries / views) * 1000) / 10 : 0,
        daysLive,
      };
    }),
    coverageGaps: [], // Would need additional query to determine gaps
  };
}

/**
 * Generate a market summary
 */
export async function generateMarketSummary(): Promise<string> {
  const context = await buildMarketContext();

  if (context.competitorDeals.length === 0) {
    return 'No market data available. Please fetch data first using the "Fetch Market Data" button.';
  }

  const competitorContext = formatDealsForContext(context.competitorDeals);
  const ourRatesContext = formatOurRatesForContext(context.ourBestRates.slice(0, 30));

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: INTELLIGENCE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `## Competitor Deals (Top 30)
${competitorContext}

## Our Best Rates (Top 30)
${ourRatesContext}

---

${SUMMARY_PROMPT}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || 'Unable to generate summary.';
}

const SOURCE_LABELS: Record<string, string> = {
  leasing_com: 'Leasing.com',
  leaseloco: 'LeaseLoco',
  appliedleasing: 'Applied Leasing',
  selectcarleasing: 'Select Car Leasing',
  vipgateway: 'VIP Gateway',
};

const formatSourceLabel = (source: string) =>
  SOURCE_LABELS[source] ||
  source
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatFreshnessLines = (snapshotDates: Record<string, Date | null>) =>
  Object.entries(snapshotDates)
    .map(
      ([source, date]) =>
        `- ${formatSourceLabel(source)}: ${date?.toISOString() || 'No data'}`
    )
    .join('\n');

const formatSpecialOffers = (offers: Array<{ manufacturer: string; model: string }>) => {
  if (offers.length === 0) {
    return 'No special offers currently flagged.';
  }
  return offers.map((offer) => `- ${offer.manufacturer} ${offer.model}`).join('\n');
};

/**
 * Chat with the intelligence assistant
 */
export async function chatWithIntelligence(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const context = await buildMarketContext();

  const competitorContext = formatDealsForContext(context.competitorDeals);
  const ourRatesContext = formatOurRatesForContext(context.ourBestRates.slice(0, 50));
  const specialOffersContext = formatSpecialOffers(context.specialOffers);
  const suggestionsContext = formatSmartSuggestionsForContext(context.smartSuggestions);
  const funderContext = formatFunderPerformanceForContext(context.funderPerformance);
  const featuredContext = formatFeaturedPerformanceForContext(context.featuredPerformance);

  const systemMessage = `${INTELLIGENCE_SYSTEM_PROMPT}

## Current Market Data

### Competitor Deals
${competitorContext || 'No competitor data available.'}

### Our Best Rates (Top 50)
${ourRatesContext || 'No rates available.'}

### Special Offers
${specialOffersContext}

### Smart Suggestions (High-Score Deals to Feature)
${suggestionsContext}

### Funder Performance
${funderContext}

### Featured Deals Performance
${featuredContext}

### Data Freshness
${formatFreshnessLines(context.snapshotDates)}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages,
  });

  return response.choices[0]?.message?.content || 'Unable to generate response.';
}

/**
 * Stream chat response
 */
export async function streamChatWithIntelligence(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AsyncIterable<string>> {
  const context = await buildMarketContext();

  const competitorContext = formatDealsForContext(context.competitorDeals);
  const ourRatesContext = formatOurRatesForContext(context.ourBestRates.slice(0, 50));
  const specialOffersContext = formatSpecialOffers(context.specialOffers);
  const suggestionsContext = formatSmartSuggestionsForContext(context.smartSuggestions);
  const funderContext = formatFunderPerformanceForContext(context.funderPerformance);
  const featuredContext = formatFeaturedPerformanceForContext(context.featuredPerformance);

  const systemMessage = `${INTELLIGENCE_SYSTEM_PROMPT}

## Current Market Data

### Competitor Deals
${competitorContext || 'No competitor data available.'}

### Our Best Rates (Top 50)
${ourRatesContext || 'No rates available.'}

### Special Offers
${specialOffersContext}

### Smart Suggestions (High-Score Deals to Feature)
${suggestionsContext}

### Funder Performance
${funderContext}

### Featured Deals Performance
${featuredContext}

### Data Freshness
${formatFreshnessLines(context.snapshotDates)}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages,
    stream: true,
  });

  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    },
  };
}
