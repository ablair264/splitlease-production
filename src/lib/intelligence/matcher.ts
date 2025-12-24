/**
 * Vehicle Matcher
 * Fuzzy matches competitor deals to our vehicles table
 */

import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
import { sql, ilike, or, and } from 'drizzle-orm';

export interface MatchCandidate {
  manufacturer: string;
  model: string;
  variant?: string | null;
}

export interface MatchResult {
  vehicleId: string | null;
  capCode: string | null;
  confidence: number; // 0-100
  matchedManufacturer: string | null;
  matchedModel: string | null;
  matchedVariant: string | null;
}

/**
 * Normalize string for comparison
 * - Lowercase
 * - Remove special characters
 * - Normalize whitespace
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses a combination of exact match, starts with, and contains
 */
function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1.0;
  if (normA.startsWith(normB) || normB.startsWith(normA)) return 0.9;
  if (normA.includes(normB) || normB.includes(normA)) return 0.7;

  // Levenshtein-like scoring for partial matches
  const words1 = normA.split(' ');
  const words2 = normB.split(' ');
  let matchedWords = 0;

  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchedWords++;
        break;
      }
    }
  }

  const totalWords = Math.max(words1.length, words2.length);
  return totalWords > 0 ? (matchedWords / totalWords) * 0.6 : 0;
}

/**
 * Find best matching vehicle from our database
 */
export async function matchVehicle(candidate: MatchCandidate): Promise<MatchResult> {
  const { manufacturer, model, variant } = candidate;

  // First, try to find vehicles with matching manufacturer
  const candidates = await db
    .select({
      id: vehicles.id,
      capCode: vehicles.capCode,
      manufacturer: vehicles.manufacturer,
      model: vehicles.model,
      variant: vehicles.variant,
    })
    .from(vehicles)
    .where(
      or(
        ilike(vehicles.manufacturer, `%${manufacturer}%`),
        ilike(vehicles.manufacturer, manufacturer)
      )
    )
    .limit(100);

  if (candidates.length === 0) {
    return {
      vehicleId: null,
      capCode: null,
      confidence: 0,
      matchedManufacturer: null,
      matchedModel: null,
      matchedVariant: null,
    };
  }

  // Score each candidate
  let bestMatch: (typeof candidates)[0] | null = null;
  let bestScore = 0;

  for (const vehicle of candidates) {
    // Manufacturer match (already filtered, so should be high)
    const mfrScore = similarity(manufacturer, vehicle.manufacturer);

    // Model match
    const modelScore = similarity(model, vehicle.model);

    // Variant match (if provided)
    let variantScore = 0;
    if (variant && vehicle.variant) {
      variantScore = similarity(variant, vehicle.variant);
    } else if (!variant && !vehicle.variant) {
      variantScore = 0.5; // Both null - neutral
    }

    // Weighted score
    // Manufacturer: 30%, Model: 40%, Variant: 30%
    const totalScore = variant
      ? mfrScore * 0.3 + modelScore * 0.4 + variantScore * 0.3
      : mfrScore * 0.4 + modelScore * 0.6;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = vehicle;
    }
  }

  if (!bestMatch || bestScore < 0.3) {
    return {
      vehicleId: null,
      capCode: null,
      confidence: Math.round(bestScore * 100),
      matchedManufacturer: null,
      matchedModel: null,
      matchedVariant: null,
    };
  }

  return {
    vehicleId: bestMatch.id,
    capCode: bestMatch.capCode,
    confidence: Math.round(bestScore * 100),
    matchedManufacturer: bestMatch.manufacturer,
    matchedModel: bestMatch.model,
    matchedVariant: bestMatch.variant,
  };
}

/**
 * Batch match multiple vehicles
 */
export async function matchVehicles(
  candidates: MatchCandidate[]
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();

  for (const candidate of candidates) {
    const key = `${candidate.manufacturer}-${candidate.model}-${candidate.variant || ''}`;
    const result = await matchVehicle(candidate);
    results.set(key, result);
  }

  return results;
}

/**
 * Quick match at manufacturer+model level only
 * Used for leasing.com aggregate data
 */
export async function matchManufacturerModel(
  manufacturer: string,
  model: string
): Promise<MatchResult> {
  return matchVehicle({ manufacturer, model, variant: null });
}
