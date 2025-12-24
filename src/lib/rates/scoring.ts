/**
 * Composite Rate Scoring System for SplitLease
 *
 * Calculates a comprehensive "deal value" score based on multiple factors:
 * - Value Score (0-100): Core cost-ratio calculation (total lease cost / basic list price)
 * - Efficiency Bonus (+0-15): EV range or fuel economy reward
 * - Affordability Modifier (-10 to +10): Market accessibility adjustment
 * - Brand Premium Bonus (+0-10): Premium brand at accessible price bonus
 *
 * The final composite score is capped at 0-100.
 */

import type { ScoreBreakdown } from "@/lib/db/schema";

// ============================================
// TYPES
// ============================================

export interface RateScoreResult {
  score: number; // 0-100 final composite score
  label: string; // "Exceptional", "Great", "Good", "Fair", "Average", "Poor"
  breakdown: ScoreBreakdown | null;
}

export interface RateInput {
  monthlyRentalPence: number;
  term: number;
  paymentPlan: string;
  basicListPricePence: number | null;
  p11dPence: number | null;
  contractType: string;
  manufacturer: string;
  fuelType: string | null;
  evRangeMiles: number | null;
  fuelEcoMpg: number | null;
}

// ============================================
// BRAND TIERS
// ============================================

const BRAND_TIERS: Record<string, string[]> = {
  premium: [
    "AUDI", "BMW", "MERCEDES", "MERCEDES-BENZ", "PORSCHE", "LAND ROVER",
    "JAGUAR", "LEXUS", "TESLA", "MASERATI", "ALFA ROMEO", "BENTLEY",
    "ASTON MARTIN", "RANGE ROVER", "LAMBORGHINI", "FERRARI", "ROLLS-ROYCE",
  ],
  aspirational: [
    "VOLVO", "MINI", "CUPRA", "POLESTAR", "GENESIS", "LOTUS", "INFINITI",
    "DS", "ALPINE",
  ],
  mainstream: [
    "VOLKSWAGEN", "FORD", "TOYOTA", "MAZDA", "HYUNDAI", "KIA", "HONDA",
    "SUBARU", "NISSAN", "MITSUBISHI", "SUZUKI",
  ],
  value: [
    "DACIA", "FIAT", "CITROEN", "SEAT", "MG", "VAUXHALL", "RENAULT",
    "SKODA", "PEUGEOT", "SMART", "LEVC",
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total payments based on payment plan and term.
 * - spread_X_down: X initial months + (term - 1) monthly payments
 * - monthly_in_advance: term payments
 */
export function getTotalPayments(term: number, paymentPlan: string): number {
  if (paymentPlan.includes("spread")) {
    const match = paymentPlan.match(/(\d+)/);
    const initialMonths = match ? parseInt(match[1], 10) : 1;
    return initialMonths + (term - 1);
  }
  return term;
}

/**
 * Get the value score (0-100) based on cost ratio.
 * Cost ratio = total lease cost / basic list price
 */
export function getValueScore(costRatio: number): number {
  if (costRatio < 0.25) return 100;
  if (costRatio < 0.35) return Math.round(100 - ((costRatio - 0.25) / 0.10) * 20); // 100→80
  if (costRatio < 0.50) return Math.round(80 - ((costRatio - 0.35) / 0.15) * 30);  // 80→50
  if (costRatio < 0.70) return Math.round(50 - ((costRatio - 0.50) / 0.20) * 30);  // 50→20
  return Math.max(0, Math.round(20 - ((costRatio - 0.70) / 0.30) * 20));           // 20→0
}

/**
 * Get efficiency bonus (0-15 points) based on fuel type and efficiency.
 * - EVs: Bonus based on range (200mi = 5pts, 300mi = 10pts, 400mi+ = 15pts)
 * - Hybrids: Combination of EV range and MPG
 * - ICE: MPG-based (ignores unrealistic values > 100)
 */
export function getEfficiencyBonus(
  fuelType: string | null,
  evRangeMiles: number | null,
  fuelEcoMpg: number | null
): number {
  if (!fuelType) return 0;

  const fuel = fuelType.toLowerCase();
  const isElectric = fuel.includes("electric") && !fuel.includes("hybrid");
  const isHybrid = fuel.includes("hybrid") || fuel.includes("phev") || fuel.includes("plug-in");

  if (isElectric && evRangeMiles && evRangeMiles > 0) {
    // Scale: 200mi = 5pts, 300mi = 10pts, 400mi+ = 15pts
    return Math.min(15, Math.max(0, (evRangeMiles - 100) / 20));
  }

  if (isHybrid) {
    const evScore = evRangeMiles && evRangeMiles > 0 ? Math.min(7, evRangeMiles / 10) : 0;
    const mpgScore = fuelEcoMpg && fuelEcoMpg > 0 && fuelEcoMpg < 100
      ? Math.min(8, (fuelEcoMpg - 30) / 10)
      : 3;
    return Math.min(15, evScore + mpgScore);
  }

  // ICE vehicles: MPG-based (ignore unrealistic values > 100)
  if (fuelEcoMpg && fuelEcoMpg > 0 && fuelEcoMpg < 100) {
    return Math.min(15, Math.max(0, (fuelEcoMpg - 25) / 2.5));
  }

  return 0;
}

/**
 * Get affordability modifier (-10 to +10 points).
 * Rewards deals in accessible price brackets.
 */
export function getAffordabilityModifier(monthlyRentalPence: number): number {
  const monthly = monthlyRentalPence / 100;

  if (monthly < 250) return 10;   // Mass market sweet spot
  if (monthly < 400) return 5;    // Accessible
  if (monthly < 600) return 0;    // Neutral
  if (monthly < 800) return -3;   // Narrower market
  if (monthly < 1000) return -6;  // Niche
  return -10;                     // Very narrow audience
}

/**
 * Get brand premium bonus (0-10 points).
 * Rewards getting a premium brand at an accessible price.
 */
export function getBrandBonus(manufacturer: string, monthlyRentalPence: number): number {
  const brand = manufacturer.toUpperCase();
  const monthly = monthlyRentalPence / 100;

  if (BRAND_TIERS.premium.includes(brand)) {
    if (monthly < 400) return 10;
    if (monthly < 600) return 7;
    if (monthly < 800) return 4;
    return 2;
  }

  if (BRAND_TIERS.aspirational.includes(brand)) {
    if (monthly < 350) return 6;
    if (monthly < 500) return 4;
    return 2;
  }

  if (BRAND_TIERS.mainstream.includes(brand)) return 1;

  return 0; // Value brands get no bonus
}

/**
 * Get the human-readable label for a score.
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 45) return "Fair";
  if (score >= 30) return "Average";
  return "Poor";
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

/**
 * Calculate the composite rate score for a lease deal.
 *
 * @param input - Rate data for scoring
 * @returns Score result with breakdown
 */
export function calculateRateScore(input: RateInput): RateScoreResult {
  const {
    monthlyRentalPence,
    term,
    paymentPlan,
    basicListPricePence,
    p11dPence,
    contractType,
    manufacturer,
    fuelType,
    evRangeMiles,
    fuelEcoMpg,
  } = input;

  // Use basic list price if available, fall back to P11D * 0.95
  const listPrice = basicListPricePence ?? (p11dPence ? Math.round(p11dPence * 0.95) : null);

  if (!listPrice || listPrice <= 0) {
    return { score: 50, label: "Unknown", breakdown: null };
  }

  // Normalize PCH to ex-VAT for fair comparison
  const isPCH = contractType.toUpperCase().includes("PCH");
  const adjustedRental = isPCH ? Math.round(monthlyRentalPence / 1.2) : monthlyRentalPence;

  // Calculate total payments based on payment plan
  const totalPayments = getTotalPayments(term, paymentPlan);
  const totalCost = adjustedRental * totalPayments;
  const costRatio = totalCost / listPrice;

  // Calculate component scores
  const valueScore = getValueScore(costRatio);
  const efficiencyBonus = Math.round(getEfficiencyBonus(fuelType, evRangeMiles, fuelEcoMpg));
  const affordabilityMod = getAffordabilityModifier(adjustedRental);
  const brandBonus = getBrandBonus(manufacturer, adjustedRental);

  // Additive composite
  const rawScore = valueScore + efficiencyBonus + affordabilityMod + brandBonus;
  const finalScore = Math.max(0, Math.min(100, rawScore));

  return {
    score: finalScore,
    label: getScoreLabel(finalScore),
    breakdown: {
      valueScore,
      efficiencyBonus,
      affordabilityMod,
      brandBonus,
      costRatio: Math.round(costRatio * 1000) / 1000, // 3 decimal places
      totalPayments,
    },
  };
}

// ============================================
// LEGACY COMPATIBILITY (deprecated - use calculateRateScore)
// ============================================

/**
 * @deprecated Use calculateRateScore instead
 */
export type RateValueScore = {
  score: number;
  valueLabel: string;
  costRatio: number | null;
};

/**
 * @deprecated Use calculateRateScore instead
 * Legacy function for backwards compatibility.
 */
export function calculateValueScore(
  monthlyRentalPence: number,
  termMonths: number,
  p11dPence: number | null,
  _co2Gkm: number | null = null,
  _evRangeMiles: number | null = null,
  contractType: string | null = null,
  initialMonths: number | null = null
): RateValueScore {
  // Build payment plan from initialMonths
  const paymentPlan = initialMonths !== null
    ? `spread_${initialMonths}_down`
    : "monthly_in_advance";

  const result = calculateRateScore({
    monthlyRentalPence,
    term: termMonths,
    paymentPlan,
    basicListPricePence: null, // Legacy doesn't have basic list price
    p11dPence,
    contractType: contractType || "CHNM",
    manufacturer: "", // Unknown in legacy
    fuelType: null,
    evRangeMiles: _evRangeMiles,
    fuelEcoMpg: null,
  });

  return {
    score: result.score,
    valueLabel: result.label,
    costRatio: result.breakdown?.costRatio ?? null,
  };
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Get a Tailwind color class for the score (for UI display).
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400"; // Exceptional
  if (score >= 65) return "text-green-400";   // Great
  if (score >= 50) return "text-lime-400";    // Good
  if (score >= 40) return "text-yellow-400";  // Fair
  return "text-gray-400";                     // Average/Poor
}

/**
 * Get a Tailwind background gradient class for the score.
 */
export function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500/20 to-emerald-500/5";
  if (score >= 65) return "from-green-500/20 to-green-500/5";
  if (score >= 50) return "from-lime-500/20 to-lime-500/5";
  if (score >= 40) return "from-yellow-500/20 to-yellow-500/5";
  return "from-gray-500/20 to-gray-500/5";
}

/**
 * Get a badge color for score display.
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= 90) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (score >= 75) return "bg-green-500/20 text-green-300 border-green-500/30";
  if (score >= 60) return "bg-lime-500/20 text-lime-300 border-lime-500/30";
  if (score >= 45) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  if (score >= 30) return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  return "bg-gray-500/20 text-gray-300 border-gray-500/30";
}

// ============================================
// BATCH SCORING
// ============================================

/**
 * Calculate scores for an array of rates (for batch processing).
 */
export function calculateBatchScores(rates: RateInput[]): RateScoreResult[] {
  return rates.map(calculateRateScore);
}

// ============================================
// MULTI-TERM SCORING (for Deal Finder)
// ============================================

export interface MultiTermScore {
  term: number;
  score: number;
  monthlyRental: number;
  totalCost: number;
  rank: "best" | "good" | "average" | "poor";
}

export interface VehicleScoreSummary {
  capCode: string;
  bestTerm: number;
  bestScore: number;
  scores: MultiTermScore[];
  averageScore: number;
}

function getScoreRank(score: number): "best" | "good" | "average" | "poor" {
  if (score >= 85) return "best";
  if (score >= 70) return "good";
  if (score >= 50) return "average";
  return "poor";
}

/**
 * Calculate scores across all contract terms for a vehicle.
 */
export function calculateMultiTermScores(
  rates: Array<{
    term: number;
    monthlyRentalPence: number;
    paymentPlan: string;
    basicListPricePence: number | null;
    p11dPence: number | null;
    contractType: string;
    manufacturer: string;
    fuelType: string | null;
    evRangeMiles: number | null;
    fuelEcoMpg: number | null;
  }>
): MultiTermScore[] {
  return rates.map((rate) => {
    const result = calculateRateScore({
      monthlyRentalPence: rate.monthlyRentalPence,
      term: rate.term,
      paymentPlan: rate.paymentPlan,
      basicListPricePence: rate.basicListPricePence,
      p11dPence: rate.p11dPence,
      contractType: rate.contractType,
      manufacturer: rate.manufacturer,
      fuelType: rate.fuelType,
      evRangeMiles: rate.evRangeMiles,
      fuelEcoMpg: rate.fuelEcoMpg,
    });

    const totalPayments = getTotalPayments(rate.term, rate.paymentPlan);
    const totalCost = rate.monthlyRentalPence * totalPayments;

    return {
      term: rate.term,
      score: result.score,
      monthlyRental: rate.monthlyRentalPence,
      totalCost,
      rank: getScoreRank(result.score),
    };
  });
}

/**
 * Find the best scoring term for a vehicle.
 */
export function findBestTerm(scores: MultiTermScore[]): MultiTermScore | null {
  if (scores.length === 0) return null;
  return scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}

// ============================================
// SALARY SACRIFICE SCORING
// ============================================

/**
 * Calculate Salary Sacrifice specific score.
 * Factors in BIK tax savings as well as lease cost.
 */
export function calculateSalarySacrificeScore(
  grossDeductionPence: number,
  term: number,
  p11dPence: number | null,
  bikPercent: number | null,
  _bikTaxMonthly: number | null,
  isZeroEmission: boolean
): RateValueScore {
  // Zero emission vehicles get bonus for 0% BIK
  const evBonus = isZeroEmission ? 10 : 0;

  // Base score from lease cost ratio
  const baseResult = calculateRateScore({
    monthlyRentalPence: grossDeductionPence,
    term,
    paymentPlan: "monthly_in_advance",
    basicListPricePence: null,
    p11dPence,
    contractType: "BSSNL",
    manufacturer: "",
    fuelType: isZeroEmission ? "Electric" : null,
    evRangeMiles: null,
    fuelEcoMpg: null,
  });

  // Adjust for low BIK (favorable tax treatment)
  let bikBonus = 0;
  if (bikPercent !== null) {
    if (bikPercent <= 2) bikBonus = 8;
    else if (bikPercent <= 5) bikBonus = 5;
    else if (bikPercent <= 10) bikBonus = 2;
  }

  const finalScore = Math.min(100, baseResult.score + evBonus + bikBonus);

  return {
    score: finalScore,
    valueLabel: getScoreLabel(finalScore),
    costRatio: baseResult.breakdown?.costRatio ?? null,
  };
}
