/**
 * Database queries for Market Intelligence Dashboard
 *
 * These queries fetch competitor deals and our rates for comparison.
 */

import { db } from '@/lib/db';
import {
  marketIntelligenceDeals,
  marketIntelligenceSnapshots,
  providerRates,
  ratebookImports,
  scoringConfig,
  vehicles,
} from '@/lib/db/schema';
import { eq, and, desc, sql, isNull, or, inArray } from 'drizzle-orm';
import { countRatesByMakeModel, selectTopRatesByScore, indexRatesByCapCode, RateCandidate } from './rate-selection';

const COMPETITOR_SOURCES = [
  'leasing_com',
  'leaseloco',
  'appliedleasing',
  'selectcarleasing',
  'vipgateway',
] as const;

const normalizeContractType = (contractType: string) =>
  contractType.toUpperCase().includes('PCH') ? 'PCHNM' : 'CHNM';

const buildContractFilter = (contractType: string) => {
  const isPersonal = normalizeContractType(contractType) === 'PCHNM';
  const fallback = and(
    isNull(marketIntelligenceDeals.vatIncluded),
    isNull(marketIntelligenceDeals.leaseType)
  );
  return or(
    eq(marketIntelligenceDeals.vatIncluded, isPersonal),
    eq(marketIntelligenceDeals.leaseType, isPersonal ? 'personal' : 'business'),
    fallback
  );
};

const getLatestSnapshots = async (sources: string[]) => {
  const snapshots = await Promise.all(
    sources.map(async (source) => {
      const latest = await db
        .select({ id: marketIntelligenceSnapshots.id, snapshotDate: marketIntelligenceSnapshots.snapshotDate, source: marketIntelligenceSnapshots.source })
        .from(marketIntelligenceSnapshots)
        .where(eq(marketIntelligenceSnapshots.source, source))
        .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
        .limit(1);
      return latest[0] || null;
    })
  );

  return snapshots.filter(Boolean) as Array<{
    id: string;
    snapshotDate: Date;
    source: string;
  }>;
};

/**
 * Fetch the latest competitor deals from Leasing.com
 */
export async function fetchLatestCompetitorDeals(contractType: string) {
  const snapshots = await getLatestSnapshots([...COMPETITOR_SOURCES]);

  if (snapshots.length === 0) {
    return { deals: [], snapshot: null };
  }

  const snapshotIds = snapshots.map((s) => s.id);
  const latestSnapshot = snapshots.reduce((latest, current) =>
    current.snapshotDate > latest.snapshotDate ? current : latest
  );

  const deals = await db
    .select({
      id: marketIntelligenceDeals.id,
      snapshotId: marketIntelligenceDeals.snapshotId,
      source: marketIntelligenceDeals.source,
      externalId: marketIntelligenceDeals.externalId,
      manufacturer: marketIntelligenceDeals.manufacturer,
      model: marketIntelligenceDeals.model,
      variant: marketIntelligenceDeals.variant,
      bodyType: marketIntelligenceDeals.bodyType,
      fuelType: marketIntelligenceDeals.fuelType,
      monthlyPrice: marketIntelligenceDeals.monthlyPrice,
      initialPayment: marketIntelligenceDeals.initialPayment,
      term: marketIntelligenceDeals.term,
      annualMileage: marketIntelligenceDeals.annualMileage,
      valueScore: marketIntelligenceDeals.valueScore,
      dealCount: marketIntelligenceDeals.dealCount,
      stockStatus: marketIntelligenceDeals.stockStatus,
      imageUrl: marketIntelligenceDeals.imageUrl,
      leaseType: marketIntelligenceDeals.leaseType,
      vatIncluded: marketIntelligenceDeals.vatIncluded,
      matchedCapCode: marketIntelligenceDeals.matchedCapCode,
      matchedVehicleId: marketIntelligenceDeals.matchedVehicleId,
      matchConfidence: marketIntelligenceDeals.matchConfidence,
      previousPrice: marketIntelligenceDeals.previousPrice,
      priceChange: marketIntelligenceDeals.priceChange,
      priceChangePercent: marketIntelligenceDeals.priceChangePercent,
    })
    .from(marketIntelligenceDeals)
    .where(and(inArray(marketIntelligenceDeals.snapshotId, snapshotIds), buildContractFilter(contractType)))
    .orderBy(desc(marketIntelligenceDeals.dealCount));

  return { deals, snapshot: latestSnapshot };
}

/**
 * Fetch our best rates grouped by make+model, returning top N derivatives per group.
 * Also returns rates indexed by CAP code for direct matching.
 */
export async function fetchOurBestRates(
  contractType: string,
  topN: number = 3
): Promise<{
  byMakeModel: Map<string, RateCandidate[]>;
  byCapCode: Map<string, RateCandidate>;
}> {
  const normalizedContract = normalizeContractType(contractType);

  const rawRates = await db
    .select({
      id: providerRates.id,
      importId: providerRates.importId,
      capCode: providerRates.capCode,
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
      variant: providerRates.variant,
      providerCode: providerRates.providerCode,
      contractType: providerRates.contractType,
      term: providerRates.term,
      annualMileage: providerRates.annualMileage,
      totalRental: providerRates.totalRental,
      p11d: providerRates.p11d,
      score: providerRates.score,
      co2Gkm: providerRates.co2Gkm,
      fuelType: providerRates.fuelType,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(
      and(
        eq(ratebookImports.isLatest, true),
        eq(providerRates.contractType, normalizedContract)
      )
    )
    .orderBy(
      providerRates.manufacturer,
      providerRates.model,
      desc(providerRates.score),
      providerRates.totalRental
    );

  return {
    byMakeModel: selectTopRatesByScore(rawRates, topN),
    byCapCode: indexRatesByCapCode(rawRates),
  };
}

/**
 * Find competitor deals that have no match in our inventory (gaps)
 */
export async function fetchUnmatchedCompetitorDeals(contractType: string) {
  const snapshots = await getLatestSnapshots([...COMPETITOR_SOURCES]);
  if (snapshots.length === 0) {
    return [];
  }

  const snapshotIds = snapshots.map((s) => s.id);

  const gaps = await db
    .select({
      manufacturer: marketIntelligenceDeals.manufacturer,
      model: marketIntelligenceDeals.model,
      monthlyPrice: marketIntelligenceDeals.monthlyPrice,
      source: marketIntelligenceDeals.source,
      dealCount: marketIntelligenceDeals.dealCount,
      valueScore: marketIntelligenceDeals.valueScore,
      imageUrl: marketIntelligenceDeals.imageUrl,
      priceChange: marketIntelligenceDeals.priceChange,
      priceChangePercent: marketIntelligenceDeals.priceChangePercent,
      leaseType: marketIntelligenceDeals.leaseType,
      vatIncluded: marketIntelligenceDeals.vatIncluded,
    })
    .from(marketIntelligenceDeals)
    .where(
      and(
        inArray(marketIntelligenceDeals.snapshotId, snapshotIds),
        buildContractFilter(contractType),
        or(
          isNull(marketIntelligenceDeals.matchedCapCode),
          isNull(marketIntelligenceDeals.matchedVehicleId)
        )
      )
    )
    .orderBy(desc(marketIntelligenceDeals.dealCount));

  return gaps;
}

/**
 * Detect price changes in competitor data (from previous snapshot)
 */
export async function fetchCompetitorPriceChanges(
  contractType: string,
  minChangePercent: number = 5
) {
  const snapshots = await getLatestSnapshots([...COMPETITOR_SOURCES]);
  if (snapshots.length === 0) {
    return [];
  }

  const snapshotIds = snapshots.map((s) => s.id);

  const changes = await db
    .select({
      manufacturer: marketIntelligenceDeals.manufacturer,
      model: marketIntelligenceDeals.model,
      currentPrice: marketIntelligenceDeals.monthlyPrice,
      previousPrice: marketIntelligenceDeals.previousPrice,
      priceChange: marketIntelligenceDeals.priceChange,
      priceChangePercent: marketIntelligenceDeals.priceChangePercent,
      source: marketIntelligenceDeals.source,
      leaseType: marketIntelligenceDeals.leaseType,
      vatIncluded: marketIntelligenceDeals.vatIncluded,
    })
    .from(marketIntelligenceDeals)
    .where(
      and(
        inArray(marketIntelligenceDeals.snapshotId, snapshotIds),
        buildContractFilter(contractType),
        sql`ABS(CAST(${marketIntelligenceDeals.priceChangePercent} AS DECIMAL)) >= ${minChangePercent}`
      )
    )
    .orderBy(sql`ABS(CAST(${marketIntelligenceDeals.priceChangePercent} AS DECIMAL)) DESC`);

  return changes;
}

/**
 * Get all unique make+model combinations from our latest rates
 */
export async function fetchOurVehicleCatalog(contractType: string) {
  const normalizedContract = normalizeContractType(contractType);

  const catalog = await db
    .selectDistinct({
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(
      and(
        eq(ratebookImports.isLatest, true),
        eq(providerRates.contractType, normalizedContract)
      )
    );

  // Return as a Set of keys for fast lookup
  return new Set(catalog.map(v => `${v.manufacturer.toLowerCase()}|${v.model.toLowerCase()}`));
}

/**
 * Count our rates by make+model for a given contract configuration
 */
export async function countOurRatesByMakeModel(
  contractType: string
) {
  const normalizedContract = normalizeContractType(contractType);

  const topRates = await db
    .select({
      manufacturer: providerRates.manufacturer,
      model: providerRates.model,
      totalRental: providerRates.totalRental,
      score: providerRates.score,
    })
    .from(providerRates)
    .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
    .where(
      and(
        eq(ratebookImports.isLatest, true),
        eq(providerRates.contractType, normalizedContract)
      )
    )
    .orderBy(desc(providerRates.score), providerRates.totalRental)
    .limit(100);

  const counts = countRatesByMakeModel(topRates);
  const minPriceByMake = new Map<string, number>();
  const maxScoreByMake = new Map<string, number>();

  for (const rate of topRates) {
    const key = `${rate.manufacturer.toLowerCase()}|${rate.model.toLowerCase()}`;
    if (
      !minPriceByMake.has(key) ||
      rate.totalRental < (minPriceByMake.get(key) ?? rate.totalRental)
    ) {
      minPriceByMake.set(key, rate.totalRental);
    }
    const scoreValue = rate.score ?? 0;
    if (!maxScoreByMake.has(key) || scoreValue > (maxScoreByMake.get(key) ?? 0)) {
      maxScoreByMake.set(key, scoreValue);
    }
  }

  return new Map(
    Array.from(counts.entries()).map(([key, count]) => [
      key,
      { count, minPrice: minPriceByMake.get(key) ?? 0, maxScore: maxScoreByMake.get(key) ?? 0 },
    ])
  );
}

export async function fetchActiveScoringConfig() {
  const configs = await db
    .select()
    .from(scoringConfig)
    .where(eq(scoringConfig.isActive, true))
    .orderBy(desc(scoringConfig.createdAt))
    .limit(1);

  return configs[0] || null;
}
