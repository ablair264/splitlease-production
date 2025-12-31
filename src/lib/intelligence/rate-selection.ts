export type RateCandidate = {
  capCode: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  providerCode: string;
  contractType: string;
  term: number;
  annualMileage: number;
  totalRental: number;
  score: number | null;
};

const scoreValue = (score: number | null) => (score === null ? 0 : score);

export function selectTopRatesByScore(
  rates: RateCandidate[],
  topN: number
): Map<string, RateCandidate[]> {
  const bestByCap = new Map<string, RateCandidate>();

  for (const rate of rates) {
    const capKey = rate.capCode || `${rate.manufacturer}|${rate.model}|${rate.variant || ""}|${rate.providerCode}`;
    const existing = bestByCap.get(capKey);
    if (!existing) {
      bestByCap.set(capKey, rate);
      continue;
    }

    const incomingScore = scoreValue(rate.score);
    const existingScore = scoreValue(existing.score);

    if (incomingScore > existingScore) {
      bestByCap.set(capKey, rate);
      continue;
    }

    if (incomingScore === existingScore && rate.totalRental < existing.totalRental) {
      bestByCap.set(capKey, rate);
    }
  }

  const grouped = new Map<string, RateCandidate[]>();
  for (const rate of Array.from(bestByCap.values())) {
    const key = `${rate.manufacturer.toLowerCase()}|${rate.model.toLowerCase()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rate);
  }

  for (const [key, group] of Array.from(grouped.entries())) {
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = scoreValue(b.score) - scoreValue(a.score);
      if (scoreDiff !== 0) return scoreDiff;
      return a.totalRental - b.totalRental;
    });
    grouped.set(key, sorted.slice(0, topN));
  }

  return grouped;
}

export function countRatesByMakeModel(
  rates: Array<{ manufacturer: string; model: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rate of rates) {
    const key = `${rate.manufacturer.toLowerCase()}|${rate.model.toLowerCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Index rates by CAP code for direct lookup
 * Returns a map of capCode -> best rate for that CAP code
 */
export function indexRatesByCapCode(
  rates: RateCandidate[]
): Map<string, RateCandidate> {
  const byCapCode = new Map<string, RateCandidate>();

  for (const rate of rates) {
    if (!rate.capCode) continue;

    const existing = byCapCode.get(rate.capCode);
    if (!existing) {
      byCapCode.set(rate.capCode, rate);
      continue;
    }

    // Keep the better one (higher score, or lower price if same score)
    const incomingScore = scoreValue(rate.score);
    const existingScore = scoreValue(existing.score);

    if (incomingScore > existingScore) {
      byCapCode.set(rate.capCode, rate);
    } else if (incomingScore === existingScore && rate.totalRental < existing.totalRental) {
      byCapCode.set(rate.capCode, rate);
    }
  }

  return byCapCode;
}
