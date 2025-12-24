/**
 * Value scoring for provider rates
 *
 * Calculates a "deal value" score based purely on the P11D to total lease cost ratio.
 * This helps rank deals by value-for-money - how much car you get for your money.
 *
 * Environmental factors (CO2, EV range) are NOT included in value scoring.
 * These should be filtered separately if important to the user.
 */

export type RateValueScore = {
  score: number; // 0-100
  valueLabel: string; // "Exceptional", "Great", "Good", "Fair", "Average"
  costRatio: number | null; // Total lease cost / P11D
};

/**
 * Calculate the value score for a rate
 *
 * Score is based purely on the cost-to-value ratio (total lease cost / P11D).
 * Lower ratio = better value = higher score.
 *
 * @param monthlyRentalPence - Monthly rental in pence
 * @param termMonths - Contract term in months (e.g., 36 for a 36-month contract)
 * @param p11dPence - P11D value in pence (null if unknown)
 * @param _co2Gkm - DEPRECATED: No longer used in scoring
 * @param _evRangeMiles - DEPRECATED: No longer used in scoring
 * @param contractType - Contract type (PCH includes VAT, strip for fair comparison)
 * @param initialMonths - Initial payment months (e.g., 3 for a 3+35 deal). If provided,
 *                        total payments = initialMonths + (termMonths - 1)
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
  let score = 0;
  let valueLabel = "Average";
  let costRatio: number | null = null;

  // Without P11D data, we can't calculate value - return neutral score
  if (!p11dPence || p11dPence <= 0 || termMonths <= 0) {
    return { score: 50, valueLabel: "Unknown", costRatio: null };
  }

  // For PCH contracts, strip VAT to compare fairly with CH (ex-VAT) rates
  // P11D is always ex-VAT, so we need ex-VAT rentals for fair comparison
  const isPCH = contractType?.toUpperCase().includes("PCH") ||
                contractType?.toLowerCase().includes("personal");
  const adjustedRentalPence = isPCH ? monthlyRentalPence / 1.2 : monthlyRentalPence;

  // Calculate total payments
  // If initialMonths provided, use: initial + remaining (term - 1)
  // e.g., 3+35 deal: 3 initial + 35 remaining = 38 total payments
  // If not provided, fall back to termMonths for backwards compatibility
  const totalPayments = initialMonths !== null
    ? initialMonths + (termMonths - 1)
    : termMonths;

  // Calculate P11D to total cost ratio (the key value metric)
  // Lower ratio = better value (paying less relative to the car's value)
  const totalCostPence = adjustedRentalPence * totalPayments;
  costRatio = totalCostPence / p11dPence;

  // Score bands based on cost ratio
  // These ranges are calibrated to typical lease market rates
  if (costRatio < 0.20) {
    score = 95;
    valueLabel = "Exceptional";
  } else if (costRatio < 0.28) {
    // Linear interpolation: 0.20 -> 95, 0.28 -> 80
    score = Math.round(95 - ((costRatio - 0.20) / 0.08) * 15);
    valueLabel = "Exceptional";
  } else if (costRatio < 0.38) {
    // Linear interpolation: 0.28 -> 80, 0.38 -> 65
    score = Math.round(80 - ((costRatio - 0.28) / 0.10) * 15);
    valueLabel = "Great";
  } else if (costRatio < 0.48) {
    // Linear interpolation: 0.38 -> 65, 0.48 -> 50
    score = Math.round(65 - ((costRatio - 0.38) / 0.10) * 15);
    valueLabel = "Good";
  } else if (costRatio < 0.58) {
    // Linear interpolation: 0.48 -> 50, 0.58 -> 40
    score = Math.round(50 - ((costRatio - 0.48) / 0.10) * 10);
    valueLabel = "Fair";
  } else if (costRatio < 0.70) {
    // Linear interpolation: 0.58 -> 40, 0.70 -> 25
    score = Math.round(40 - ((costRatio - 0.58) / 0.12) * 15);
    valueLabel = "Average";
  } else {
    // Poor value - above 70% of car value over term
    score = Math.max(10, Math.round(25 - ((costRatio - 0.70) / 0.30) * 15));
    valueLabel = "Poor";
  }

  // Ensure score stays in valid range
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    valueLabel,
    costRatio,
  };
}

/**
 * Get the label for a score (for when score is already stored in DB)
 */
export function getScoreLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 80) return "Exceptional";
  if (score >= 65) return "Great";
  if (score >= 50) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

/**
 * Get a color class for the value score (for UI display)
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400"; // Exceptional
  if (score >= 65) return "text-green-400"; // Great
  if (score >= 50) return "text-lime-400"; // Good
  if (score >= 40) return "text-yellow-400"; // Fair
  return "text-gray-400"; // Average/Poor
}

/**
 * Get a background gradient class for the value score
 */
export function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500/20 to-emerald-500/5";
  if (score >= 65) return "from-green-500/20 to-green-500/5";
  if (score >= 50) return "from-lime-500/20 to-lime-500/5";
  if (score >= 40) return "from-yellow-500/20 to-yellow-500/5";
  return "from-gray-500/20 to-gray-500/5";
}

/**
 * Calculate value scores for an array of rates (for batch processing)
 */
export function calculateBatchValueScores(
  rates: Array<{
    totalRental: number;
    term: number;
    p11d: number | null;
    co2Gkm: number | null;
    evRangeMiles: number | null;
  }>
): RateValueScore[] {
  return rates.map((rate) =>
    calculateValueScore(
      rate.totalRental,
      rate.term,
      rate.p11d,
      rate.co2Gkm,
      rate.evRangeMiles
    )
  );
}

/**
 * Multi-term score interface for displaying all term options
 */
export interface MultiTermScore {
  term: number; // 24, 36, 48, 60
  score: number;
  monthlyRental: number;
  totalCost: number;
  rank: "best" | "good" | "average" | "poor";
}

/**
 * Vehicle score summary across all terms
 */
export interface VehicleScoreSummary {
  capCode: string;
  bestTerm: number;
  bestScore: number;
  scores: MultiTermScore[];
  averageScore: number;
}

/**
 * Calculate scores across all contract terms for a vehicle.
 * Used for Deal Finder and Rate Explorer to show best value at each term.
 */
export function calculateMultiTermScores(
  rates: Array<{
    term: number;
    monthlyRentalPence: number;
    p11dPence: number | null;
    contractType: string;
  }>
): MultiTermScore[] {
  return rates.map((rate) => {
    const baseScore = calculateValueScore(
      rate.monthlyRentalPence,
      rate.term,
      rate.p11dPence,
      null,
      null,
      rate.contractType
    );

    const totalCost = rate.monthlyRentalPence * rate.term;

    return {
      term: rate.term,
      score: baseScore.score,
      monthlyRental: rate.monthlyRentalPence,
      totalCost,
      rank: getScoreRank(baseScore.score),
    };
  });
}

/**
 * Helper function to categorize score into rank
 */
function getScoreRank(score: number): "best" | "good" | "average" | "poor" {
  if (score >= 85) return "best";
  if (score >= 70) return "good";
  if (score >= 50) return "average";
  return "poor";
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

/**
 * Calculate Salary Sacrifice specific score.
 * Factors in BIK tax savings as well as lease cost.
 */
export function calculateSalarySacrificeScore(
  grossDeductionPence: number,
  term: number,
  p11dPence: number | null,
  bikPercent: number | null,
  bikTaxMonthly: number | null, // At user's tax rate
  isZeroEmission: boolean
): RateValueScore {
  // Zero emission vehicles get bonus for 0% BIK
  const evBonus = isZeroEmission ? 10 : 0;

  // Base score from lease cost ratio
  const baseScore = calculateValueScore(
    grossDeductionPence,
    term,
    p11dPence,
    null,
    null,
    "BSSNL"
  );

  // Adjust for low BIK (favorable tax treatment)
  let bikBonus = 0;
  if (bikPercent !== null) {
    if (bikPercent <= 2) bikBonus = 8;
    else if (bikPercent <= 5) bikBonus = 5;
    else if (bikPercent <= 10) bikBonus = 2;
  }

  const finalScore = Math.min(100, baseScore.score + evBonus + bikBonus);

  return {
    ...baseScore,
    score: finalScore,
  };
}
