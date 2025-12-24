/**
 * Comparison Logic for Market Intelligence
 *
 * Compares our rates to competitor aggregate pricing to identify:
 * - Opportunities (we're cheaper)
 * - Threats (we're more expensive)
 * - Gaps (trending vehicles we don't have)
 * - Price Alerts (significant changes)
 * - Feature Suggestions (best deals to highlight)
 */

import {
  Opportunity,
  Threat,
  Gap,
  PriceAlert,
  FeatureSuggestion,
  DerivativeRate,
  IntelligenceData,
  IntelligenceMetadata,
} from './types';
import {
  fetchLatestCompetitorDeals,
  fetchOurBestRates,
  fetchUnmatchedCompetitorDeals,
  fetchCompetitorPriceChanges,
  countOurRatesByMakeModel,
  fetchActiveScoringConfig,
} from './queries';
import { resolvePopularityCount } from './popularity';

/**
 * Main comparison function - generates all intelligence data
 */
export async function generateIntelligenceData(
  contractType: string
): Promise<IntelligenceData> {
  // Fetch all required data in parallel
  const [competitorData, ourRatesMap, gaps, priceChanges, ourCounts, scoringConfig] =
    await Promise.all([
      fetchLatestCompetitorDeals(contractType),
      fetchOurBestRates(contractType, 3),
      fetchUnmatchedCompetitorDeals(contractType),
      fetchCompetitorPriceChanges(contractType, 5),
      countOurRatesByMakeModel(contractType),
      fetchActiveScoringConfig(),
    ]);

  const { deals: competitorDeals, snapshot } = competitorData;

  // Generate comparisons
  const opportunities: Opportunity[] = [];
  const threats: Threat[] = [];

  for (const deal of competitorDeals) {
    const key = `${deal.manufacturer.toLowerCase()}|${deal.model.toLowerCase()}`;
    const ourRates = ourRatesMap.get(key);
    const popularityCount = resolvePopularityCount(
      ourCounts,
      deal.manufacturer,
      deal.model
    );

    if (!ourRates || ourRates.length === 0) {
      // No match - this is a gap (handled separately)
      continue;
    }

    // Get our best price (first rate in sorted list)
    const ourBestRate = ourRates[0];
    const ourBestPrice = ourBestRate.totalRental;
    const competitorPrice = deal.monthlyPrice;

    const priceDifference = competitorPrice - ourBestPrice;
    const differencePercent = competitorPrice > 0
      ? (priceDifference / competitorPrice) * 100
      : 0;

    if (priceDifference > 0) {
      // We're cheaper - opportunity
      opportunities.push({
        manufacturer: deal.manufacturer,
        model: deal.model,
        ourTopDerivatives: ourRates.map(r => ({
          variant: r.variant || 'Unknown',
          capCode: r.capCode || '',
          ourPrice: r.totalRental,
          ourProvider: r.providerCode,
          ourScore: r.score || 50,
          term: r.term,
          mileage: r.annualMileage,
          contractType: r.contractType,
        })),
        competitorPrice,
        competitorSource: deal.source,
        priceDifference,
        marginPercent: differencePercent,
        competitorDealCount: popularityCount,
        competitorValueScore: deal.valueScore,
      });
    } else if (priceDifference < 0) {
      // Competitor is cheaper - threat
      const severity = getSeverity(Math.abs(differencePercent));
      threats.push({
        manufacturer: deal.manufacturer,
        model: deal.model,
        ourBestPrice,
        ourBestDerivative: ourBestRate.variant || 'Unknown',
        ourProvider: ourBestRate.providerCode,
        competitorPrice,
        competitorSource: deal.source,
        priceDifference,
        differencePercent: Math.abs(differencePercent),
        severity,
      });
    }
  }

  // Process gaps (competitor vehicles we don't have)
  const processedGaps: Gap[] = gaps.map(g => ({
    manufacturer: g.manufacturer,
    model: g.model,
    competitorPrice: g.monthlyPrice,
    competitorSource: g.source,
    dealCount: resolvePopularityCount(ourCounts, g.manufacturer, g.model),
    valueScore: g.valueScore,
    imageUrl: g.imageUrl,
    trend: getTrend(g.priceChange, g.priceChangePercent),
  }));

  // Process price alerts
  const priceAlerts: PriceAlert[] = priceChanges.map(c => ({
    manufacturer: c.manufacturer,
    model: c.model,
    derivative: null,
    source: 'competitor' as const,
    provider: c.source,
    previousPrice: c.previousPrice || 0,
    currentPrice: c.currentPrice,
    changeAmount: c.priceChange || 0,
    changePercent: parseFloat(c.priceChangePercent || '0'),
    changeDirection: (c.priceChange || 0) > 0 ? 'increase' : 'decrease',
    detectedAt: new Date(),
  }));

  // Generate feature suggestions from top opportunities
  const minScore = scoringConfig?.thresholds?.good?.min ?? 70;

  const featureSuggestions: FeatureSuggestion[] = opportunities
    .filter(o => o.marginPercent >= 5 && o.ourTopDerivatives[0]?.ourScore >= minScore)
    .slice(0, 10)
    .map(o => {
      const topDeriv = o.ourTopDerivatives[0];
      return {
        capCode: topDeriv.capCode,
        manufacturer: o.manufacturer,
        model: o.model,
        derivative: topDeriv.variant,
        ourPrice: topDeriv.ourPrice,
        ourProvider: topDeriv.ourProvider,
        score: topDeriv.ourScore,
        reason: getFeatureReason(o.marginPercent, topDeriv.ourScore, o.competitorDealCount),
        competitiveAdvantage: o.priceDifference,
        advantagePercent: o.marginPercent,
        imageUrl: null,
      };
    });

  // Sort results
  opportunities.sort((a, b) => b.marginPercent - a.marginPercent);
  threats.sort((a, b) => b.differencePercent - a.differencePercent);
  processedGaps.sort((a, b) => b.dealCount - a.dealCount);
  priceAlerts.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  const metadata: IntelligenceMetadata = {
    lastFetch: new Date(),
    competitorDealsCount: competitorDeals.length,
    ourRatesCount: ourRatesMap.size,
    snapshotId: snapshot?.id || null,
    snapshotDate: snapshot?.snapshotDate || null,
  };

  return {
    opportunities,
    threats,
    gaps: processedGaps,
    priceAlerts,
    featureSuggestions,
    metadata,
  };
}

/**
 * Determine severity based on price difference percentage
 */
function getSeverity(differencePercent: number): 'high' | 'medium' | 'low' {
  if (differencePercent >= 15) return 'high';
  if (differencePercent >= 8) return 'medium';
  return 'low';
}

/**
 * Determine price trend from change data
 */
function getTrend(
  priceChange: number | null,
  priceChangePercent: string | null
): 'rising' | 'falling' | 'stable' {
  const percent = parseFloat(priceChangePercent || '0');
  if (percent >= 3) return 'rising';
  if (percent <= -3) return 'falling';
  return 'stable';
}

/**
 * Generate reason string for feature suggestion
 */
function getFeatureReason(
  marginPercent: number,
  score: number,
  competitorDealCount: number
): string {
  const reasons: string[] = [];

  if (marginPercent >= 15) {
    reasons.push(`${marginPercent.toFixed(0)}% cheaper than competitors`);
  } else if (marginPercent >= 10) {
    reasons.push(`${marginPercent.toFixed(0)}% below market price`);
  } else {
    reasons.push(`Competitive pricing (${marginPercent.toFixed(0)}% under)`);
  }

  if (score >= 90) {
    reasons.push('exceptional value score');
  } else if (score >= 80) {
    reasons.push('excellent value score');
  }

  if (competitorDealCount >= 50) {
    reasons.push('high market demand');
  } else if (competitorDealCount >= 20) {
    reasons.push('popular model');
  }

  return reasons.join(', ');
}

/**
 * Normalize manufacturer names for matching
 */
export function normalizeManufacturer(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s-]+/g, '')
    .replace('mercedes-benz', 'mercedes')
    .replace('volkswagen', 'vw')
    .replace('bmw', 'bmw')
    .replace('audi', 'audi');
}

/**
 * Normalize model names for matching
 */
export function normalizeModel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s-]+/g, '')
    .replace(/['"]/g, '');
}

/**
 * Check if two make+model combinations match (fuzzy)
 */
export function makeModelMatch(
  mfr1: string,
  model1: string,
  mfr2: string,
  model2: string
): boolean {
  const normMfr1 = normalizeManufacturer(mfr1);
  const normMfr2 = normalizeManufacturer(mfr2);
  const normModel1 = normalizeModel(model1);
  const normModel2 = normalizeModel(model2);

  // Exact match on manufacturer
  if (normMfr1 !== normMfr2) return false;

  // Exact or contains match on model
  return normModel1 === normModel2 ||
         normModel1.includes(normModel2) ||
         normModel2.includes(normModel1);
}
