/**
 * Types for Market Intelligence Dashboard
 *
 * These types define the structure of intelligence data comparing
 * our rates to competitor (Leasing.com) aggregate pricing.
 */

/**
 * Complete intelligence data returned from the analysis API
 */
export interface IntelligenceData {
  opportunities: Opportunity[];
  threats: Threat[];
  gaps: Gap[];
  priceAlerts: PriceAlert[];
  featureSuggestions: FeatureSuggestion[];
  metadata: IntelligenceMetadata;
}

/**
 * Metadata about the intelligence data fetch
 */
export interface IntelligenceMetadata {
  lastFetch: Date;
  competitorDealsCount: number;
  ourRatesCount: number;
  snapshotId: string | null;
  snapshotDate: Date | null;
}

/**
 * Opportunity: We're cheaper than competitors
 * These are deals we should promote/feature
 */
export interface Opportunity {
  manufacturer: string;
  model: string;
  ourTopDerivatives: DerivativeRate[];
  competitorPrice: number; // pence (aggregate)
  competitorSource: string;
  priceDifference: number; // pence (positive = we're cheaper)
  marginPercent: number;
  competitorDealCount: number;
  competitorValueScore: number | null;
}

/**
 * Individual derivative rate from our database
 */
export interface DerivativeRate {
  variant: string;
  capCode: string;
  ourPrice: number; // pence
  ourProvider: string;
  ourScore: number;
  term: number;
  mileage: number;
  contractType: string;
}

/**
 * Threat: Competitors are cheaper than us
 * These are areas where we need to improve pricing
 */
export interface Threat {
  manufacturer: string;
  model: string;
  ourBestPrice: number; // pence
  ourBestDerivative: string;
  ourProvider: string;
  competitorPrice: number; // pence
  competitorSource: string;
  priceDifference: number; // pence (negative = we're more expensive)
  differencePercent: number;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Gap: Trending vehicles we don't have rates for
 * These represent market opportunities we're missing
 */
export interface Gap {
  manufacturer: string;
  model: string;
  competitorPrice: number; // pence
  competitorSource: string;
  dealCount: number;
  valueScore: number | null;
  imageUrl: string | null;
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Price Alert: Significant price changes
 * Can be from our rates or competitor rates
 */
export interface PriceAlert {
  manufacturer: string;
  model: string;
  derivative: string | null;
  source: 'our_rates' | 'competitor';
  provider: string | null;
  previousPrice: number;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  changeDirection: 'increase' | 'decrease';
  detectedAt: Date;
}

/**
 * Feature Suggestion: Deals we should highlight
 * High-scoring deals where we have competitive advantage
 */
export interface FeatureSuggestion {
  capCode: string;
  manufacturer: string;
  model: string;
  derivative: string;
  ourPrice: number;
  ourProvider: string;
  score: number;
  reason: string;
  competitiveAdvantage: number; // How much cheaper we are in pence
  advantagePercent: number;
  imageUrl: string | null;
}

/**
 * Comparison result for a single make+model
 */
export interface MakeModelComparison {
  manufacturer: string;
  model: string;
  ourRates: DerivativeRate[];
  ourBestPrice: number | null;
  competitorPrice: number | null;
  competitorSource: string | null;
  priceDifference: number | null;
  category: 'opportunity' | 'threat' | 'neutral' | 'no_match';
}

/**
 * Filter parameters for intelligence queries
 */
export interface IntelligenceFilters {
  contractType: string;
  manufacturer?: string;
  model?: string;
}

/**
 * API response structure
 */
export interface IntelligenceApiResponse {
  success: boolean;
  data: IntelligenceData;
  error?: string;
}

/**
 * Raw competitor deal from market_intelligence_deals table
 */
export interface RawCompetitorDeal {
  id: string;
  snapshotId: string;
  source: string;
  externalId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  bodyType: string | null;
  fuelType: string | null;
  monthlyPrice: number;
  initialPayment: number | null;
  term: number | null;
  annualMileage: number | null;
  valueScore: number | null;
  dealCount: number | null;
  stockStatus: string | null;
  imageUrl: string | null;
  leaseType: string | null;
  vatIncluded: boolean | null;
  matchedCapCode: string | null;
  matchedVehicleId: string | null;
  matchConfidence: string | null;
  previousPrice: number | null;
  priceChange: number | null;
  priceChangePercent: string | null;
}

/**
 * Raw provider rate from provider_rates table
 */
export interface RawProviderRate {
  id: string;
  importId: string;
  vehicleId: string | null;
  capCode: string;
  manufacturer: string;
  model: string;
  derivative: string | null;
  providerRef: string | null;
  contractType: string;
  term: number;
  annualMileage: number;
  initialMonths: number | null;
  totalRental: number;
  monthlyRental: number | null;
  financeRental: number | null;
  maintenanceRental: number | null;
  excessMileageCharge: number | null;
  p11d: number | null;
  co2Gkm: number | null;
  score: number | null;
  costRatio: number | null;
  providerName: string | null;
}
