import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  marketIntelligenceSnapshots,
  marketIntelligenceDeals,
} from '@/lib/db/schema';
import { fetchLeasingComDeals, normalizeLeasingComDeal } from '@/lib/intelligence/leasing-com';
import { fetchLeaseLocoDeals, normalizeTrendingDeal } from '@/lib/intelligence/leaseloco';
import {
  fetchAppliedLeasingDeals,
  fetchSelectCarLeasingDeals,
  fetchVipGatewayDeals,
  type ParsedCompetitorDeal,
} from '@/lib/intelligence/competitor-scrapers';
import { matchVehicle } from '@/lib/intelligence/matcher';
import { eq, desc, and } from 'drizzle-orm';

export const maxDuration = 60; // Allow up to 60 seconds for fetching

interface FetchResult {
  source: string;
  dealsCount: number;
  snapshotId: string;
  error?: string;
}

type NormalizedCompetitorDeal = {
  source: string;
  externalId: string;
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
  rawData: Record<string, unknown>;
};

const buildExternalId = (deal: ParsedCompetitorDeal) => {
  const base = deal.url
    ? new URL(deal.url).pathname
    : `${deal.manufacturer}-${deal.model}-${deal.variant ?? ""}`;
  const normalizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = [deal.leaseType, deal.term?.toString(), deal.annualMileage?.toString()]
    .filter(Boolean)
    .join("-");
  return suffix ? `${normalizedBase}-${suffix}` : normalizedBase;
};

const normalizeParsedDeal = (
  source: string,
  deal: ParsedCompetitorDeal
): NormalizedCompetitorDeal | null => {
  if (!deal.manufacturer || !deal.model || deal.monthlyPrice === null) {
    return null;
  }

  return {
    source,
    externalId: buildExternalId(deal),
    manufacturer: deal.manufacturer,
    model: deal.model,
    variant: deal.variant,
    bodyType: null,
    fuelType: null,
    monthlyPrice: Math.round(deal.monthlyPrice * 100),
    initialPayment: deal.initialPayment ? Math.round(deal.initialPayment * 100) : null,
    term: deal.term,
    annualMileage: deal.annualMileage,
    valueScore: null,
    dealCount: 1,
    stockStatus: null,
    imageUrl: deal.imageUrl,
    leaseType: deal.leaseType,
    vatIncluded: deal.vatIncluded,
    rawData: {
      url: deal.url,
      leaseType: deal.leaseType,
      vatIncluded: deal.vatIncluded,
    },
  };
};

/**
 * POST /api/admin/intelligence/fetch
 * Fetch market data from competitor sources and store in database
 *
 * Authentication: Either user session OR cron secret header
 */
export async function POST(request: NextRequest) {
  // Check for cron secret (for scheduled functions)
  const cronSecret = request.headers.get("x-cron-secret");
  const validCronSecret = process.env.CRON_SECRET;

  // If no cron secret or invalid, fall back to session auth
  if (!cronSecret || cronSecret !== validCronSecret) {
    // Dynamic import to avoid issues with edge runtime
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const sources = body.sources || [
      'leasing_com',
      'leaseloco',
      'appliedleasing',
      'selectcarleasing',
      'vipgateway',
    ];

    const results: FetchResult[] = [];

    // Fetch from leasing.com
    if (sources.includes('leasing_com')) {
      try {
        const deals = await fetchLeasingComDeals({ itemsPerPage: 30 });
        const normalizedDeals = deals.map(normalizeLeasingComDeal);

        // Get previous snapshot for trend comparison
        const previousSnapshot = await db
          .select()
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, 'leasing_com'))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        // Get previous deals for price comparison
        const previousDeals = previousSnapshot[0]
          ? await db
              .select()
              .from(marketIntelligenceDeals)
              .where(eq(marketIntelligenceDeals.snapshotId, previousSnapshot[0].id))
          : [];

        const previousPriceMap = new Map(
          previousDeals.map((d) => [`${d.manufacturer}-${d.model}`, d.monthlyPrice])
        );

        // Calculate aggregates
        const avgPrice =
          normalizedDeals.reduce((sum, d) => sum + d.monthlyPrice, 0) /
          normalizedDeals.length;
        const prices = normalizedDeals.map((d) => d.monthlyPrice);

        // Create snapshot
        const [snapshot] = await db
          .insert(marketIntelligenceSnapshots)
          .values({
            source: 'leasing_com',
            totalDealsCount: normalizedDeals.length,
            avgMonthlyPrice: Math.round(avgPrice),
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            rawData: { fetchedAt: new Date().toISOString() },
          })
          .returning();

        // Insert deals with matching and trend data
        for (const deal of normalizedDeals) {
          // Try to match to our vehicles
          const match = await matchVehicle({
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
          });

          // Calculate price change
          const prevPrice = previousPriceMap.get(`${deal.manufacturer}-${deal.model}`);
          const priceChange = prevPrice ? deal.monthlyPrice - prevPrice : null;
          const priceChangePercent =
            prevPrice && priceChange ? (priceChange / prevPrice) * 100 : null;

          await db.insert(marketIntelligenceDeals).values({
            snapshotId: snapshot.id,
            source: 'leasing_com',
            externalId: deal.externalId,
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
            bodyType: deal.bodyType,
            fuelType: deal.fuelType,
            monthlyPrice: deal.monthlyPrice,
            initialPayment: deal.initialPayment,
            term: deal.term,
            annualMileage: deal.annualMileage,
            valueScore: deal.valueScore,
            dealCount: deal.dealCount,
            stockStatus: deal.stockStatus,
            imageUrl: deal.imageUrl,
            leaseType: deal.leaseType,
            vatIncluded: deal.vatIncluded,
            matchedCapCode: match.capCode,
            matchedVehicleId: match.vehicleId,
            matchConfidence: match.confidence.toString(),
            previousPrice: prevPrice,
            priceChange,
            priceChangePercent: priceChangePercent?.toFixed(2),
            rawData: deal.rawData,
          });
        }

        results.push({
          source: 'leasing_com',
          dealsCount: normalizedDeals.length,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        console.error('Error fetching from leasing.com:', error);
        results.push({
          source: 'leasing_com',
          dealsCount: 0,
          snapshotId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fetch from LeaseLoco
    if (sources.includes('leaseloco')) {
      try {
        const deals = await fetchLeaseLocoDeals();
        const normalizedDeals = deals.slice(0, 30).map(normalizeTrendingDeal);

        // Get previous snapshot for trend comparison
        const previousSnapshot = await db
          .select()
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, 'leaseloco'))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        const previousDeals = previousSnapshot[0]
          ? await db
              .select()
              .from(marketIntelligenceDeals)
              .where(eq(marketIntelligenceDeals.snapshotId, previousSnapshot[0].id))
          : [];

        const previousPriceMap = new Map(
          previousDeals.map((d) => [d.externalId, d.monthlyPrice])
        );

        // Calculate aggregates
        const avgPrice =
          normalizedDeals.reduce((sum, d) => sum + d.monthlyPrice, 0) /
          normalizedDeals.length;
        const prices = normalizedDeals.map((d) => d.monthlyPrice);

        // Fuel type breakdown
        const fuelBreakdown: Record<string, number> = {};
        normalizedDeals.forEach((d) => {
          const fuel = d.fuelType || 'Unknown';
          fuelBreakdown[fuel] = (fuelBreakdown[fuel] || 0) + 1;
        });

        // Create snapshot
        const [snapshot] = await db
          .insert(marketIntelligenceSnapshots)
          .values({
            source: 'leaseloco',
            totalDealsCount: normalizedDeals.length,
            avgMonthlyPrice: Math.round(avgPrice),
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            vehicleTypeBreakdown: fuelBreakdown,
            rawData: { fetchedAt: new Date().toISOString() },
          })
          .returning();

        // Insert deals with matching and trend data
        for (const deal of normalizedDeals) {
          const match = await matchVehicle({
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
          });

          const prevPrice = previousPriceMap.get(deal.externalId);
          const priceChange = prevPrice ? deal.monthlyPrice - prevPrice : null;
          const priceChangePercent =
            prevPrice && priceChange ? (priceChange / prevPrice) * 100 : null;

          await db.insert(marketIntelligenceDeals).values({
            snapshotId: snapshot.id,
            source: 'leaseloco',
            externalId: deal.externalId,
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
            bodyType: deal.bodyType,
            fuelType: deal.fuelType,
            monthlyPrice: deal.monthlyPrice,
            initialPayment: deal.initialPayment,
            term: deal.term,
            annualMileage: deal.annualMileage,
            valueScore: deal.valueScore,
            dealCount: deal.dealCount,
            stockStatus: deal.stockStatus,
            imageUrl: deal.imageUrl,
            leaseType: deal.leaseType,
            vatIncluded: deal.vatIncluded,
            matchedCapCode: match.capCode,
            matchedVehicleId: match.vehicleId,
            matchConfidence: match.confidence.toString(),
            previousPrice: prevPrice,
            priceChange,
            priceChangePercent: priceChangePercent?.toFixed(2),
            rawData: deal.rawData,
          });
        }

        results.push({
          source: 'leaseloco',
          dealsCount: normalizedDeals.length,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        console.error('Error fetching from LeaseLoco:', error);
        results.push({
          source: 'leaseloco',
          dealsCount: 0,
          snapshotId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fetch from Applied Leasing
    if (sources.includes('appliedleasing')) {
      try {
        const parsedDeals = await fetchAppliedLeasingDeals();
        const normalizedDeals = parsedDeals
          .map((deal) => normalizeParsedDeal('appliedleasing', deal))
          .filter((deal): deal is NormalizedCompetitorDeal => Boolean(deal));

        const previousSnapshot = await db
          .select()
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, 'appliedleasing'))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        const previousDeals = previousSnapshot[0]
          ? await db
              .select()
              .from(marketIntelligenceDeals)
              .where(eq(marketIntelligenceDeals.snapshotId, previousSnapshot[0].id))
          : [];

        const previousPriceMap = new Map(
          previousDeals.map((d) => [d.externalId || '', d.monthlyPrice])
        );

        const avgPrice =
          normalizedDeals.reduce((sum, d) => sum + d.monthlyPrice, 0) /
          normalizedDeals.length;
        const prices = normalizedDeals.map((d) => d.monthlyPrice);

        const [snapshot] = await db
          .insert(marketIntelligenceSnapshots)
          .values({
            source: 'appliedleasing',
            totalDealsCount: normalizedDeals.length,
            avgMonthlyPrice: Math.round(avgPrice),
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            rawData: { fetchedAt: new Date().toISOString() },
          })
          .returning();

        for (const deal of normalizedDeals) {
          const match = await matchVehicle({
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
          });

          const prevPrice = previousPriceMap.get(deal.externalId);
          const priceChange = prevPrice ? deal.monthlyPrice - prevPrice : null;
          const priceChangePercent =
            prevPrice && priceChange ? (priceChange / prevPrice) * 100 : null;

          await db.insert(marketIntelligenceDeals).values({
            snapshotId: snapshot.id,
            source: 'appliedleasing',
            externalId: deal.externalId,
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
            bodyType: deal.bodyType,
            fuelType: deal.fuelType,
            monthlyPrice: deal.monthlyPrice,
            initialPayment: deal.initialPayment,
            term: deal.term,
            annualMileage: deal.annualMileage,
            valueScore: deal.valueScore,
            dealCount: deal.dealCount,
            stockStatus: deal.stockStatus,
            imageUrl: deal.imageUrl,
            leaseType: deal.leaseType,
            vatIncluded: deal.vatIncluded,
            matchedCapCode: match.capCode,
            matchedVehicleId: match.vehicleId,
            matchConfidence: match.confidence.toString(),
            previousPrice: prevPrice,
            priceChange,
            priceChangePercent: priceChangePercent?.toFixed(2),
            rawData: deal.rawData,
          });
        }

        results.push({
          source: 'appliedleasing',
          dealsCount: normalizedDeals.length,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        console.error('Error fetching from Applied Leasing:', error);
        results.push({
          source: 'appliedleasing',
          dealsCount: 0,
          snapshotId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fetch from Select Car Leasing
    if (sources.includes('selectcarleasing')) {
      try {
        const parsedDeals = await fetchSelectCarLeasingDeals();
        const normalizedDeals = parsedDeals
          .map((deal) => normalizeParsedDeal('selectcarleasing', deal))
          .filter((deal): deal is NormalizedCompetitorDeal => Boolean(deal));

        const previousSnapshot = await db
          .select()
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, 'selectcarleasing'))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        const previousDeals = previousSnapshot[0]
          ? await db
              .select()
              .from(marketIntelligenceDeals)
              .where(eq(marketIntelligenceDeals.snapshotId, previousSnapshot[0].id))
          : [];

        const previousPriceMap = new Map(
          previousDeals.map((d) => [d.externalId || '', d.monthlyPrice])
        );

        const avgPrice =
          normalizedDeals.reduce((sum, d) => sum + d.monthlyPrice, 0) /
          normalizedDeals.length;
        const prices = normalizedDeals.map((d) => d.monthlyPrice);

        const [snapshot] = await db
          .insert(marketIntelligenceSnapshots)
          .values({
            source: 'selectcarleasing',
            totalDealsCount: normalizedDeals.length,
            avgMonthlyPrice: Math.round(avgPrice),
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            rawData: { fetchedAt: new Date().toISOString() },
          })
          .returning();

        for (const deal of normalizedDeals) {
          const match = await matchVehicle({
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
          });

          const prevPrice = previousPriceMap.get(deal.externalId);
          const priceChange = prevPrice ? deal.monthlyPrice - prevPrice : null;
          const priceChangePercent =
            prevPrice && priceChange ? (priceChange / prevPrice) * 100 : null;

          await db.insert(marketIntelligenceDeals).values({
            snapshotId: snapshot.id,
            source: 'selectcarleasing',
            externalId: deal.externalId,
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
            bodyType: deal.bodyType,
            fuelType: deal.fuelType,
            monthlyPrice: deal.monthlyPrice,
            initialPayment: deal.initialPayment,
            term: deal.term,
            annualMileage: deal.annualMileage,
            valueScore: deal.valueScore,
            dealCount: deal.dealCount,
            stockStatus: deal.stockStatus,
            imageUrl: deal.imageUrl,
            leaseType: deal.leaseType,
            vatIncluded: deal.vatIncluded,
            matchedCapCode: match.capCode,
            matchedVehicleId: match.vehicleId,
            matchConfidence: match.confidence.toString(),
            previousPrice: prevPrice,
            priceChange,
            priceChangePercent: priceChangePercent?.toFixed(2),
            rawData: deal.rawData,
          });
        }

        results.push({
          source: 'selectcarleasing',
          dealsCount: normalizedDeals.length,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        console.error('Error fetching from Select Car Leasing:', error);
        results.push({
          source: 'selectcarleasing',
          dealsCount: 0,
          snapshotId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Fetch from VIP Gateway
    if (sources.includes('vipgateway')) {
      try {
        const parsedDeals = await fetchVipGatewayDeals();
        const normalizedDeals = parsedDeals
          .map((deal) => normalizeParsedDeal('vipgateway', deal))
          .filter((deal): deal is NormalizedCompetitorDeal => Boolean(deal));

        const previousSnapshot = await db
          .select()
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, 'vipgateway'))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        const previousDeals = previousSnapshot[0]
          ? await db
              .select()
              .from(marketIntelligenceDeals)
              .where(eq(marketIntelligenceDeals.snapshotId, previousSnapshot[0].id))
          : [];

        const previousPriceMap = new Map(
          previousDeals.map((d) => [d.externalId || '', d.monthlyPrice])
        );

        const avgPrice =
          normalizedDeals.reduce((sum, d) => sum + d.monthlyPrice, 0) /
          normalizedDeals.length;
        const prices = normalizedDeals.map((d) => d.monthlyPrice);

        const [snapshot] = await db
          .insert(marketIntelligenceSnapshots)
          .values({
            source: 'vipgateway',
            totalDealsCount: normalizedDeals.length,
            avgMonthlyPrice: Math.round(avgPrice),
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            rawData: { fetchedAt: new Date().toISOString() },
          })
          .returning();

        for (const deal of normalizedDeals) {
          const match = await matchVehicle({
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
          });

          const prevPrice = previousPriceMap.get(deal.externalId);
          const priceChange = prevPrice ? deal.monthlyPrice - prevPrice : null;
          const priceChangePercent =
            prevPrice && priceChange ? (priceChange / prevPrice) * 100 : null;

          await db.insert(marketIntelligenceDeals).values({
            snapshotId: snapshot.id,
            source: 'vipgateway',
            externalId: deal.externalId,
            manufacturer: deal.manufacturer,
            model: deal.model,
            variant: deal.variant,
            bodyType: deal.bodyType,
            fuelType: deal.fuelType,
            monthlyPrice: deal.monthlyPrice,
            initialPayment: deal.initialPayment,
            term: deal.term,
            annualMileage: deal.annualMileage,
            valueScore: deal.valueScore,
            dealCount: deal.dealCount,
            stockStatus: deal.stockStatus,
            imageUrl: deal.imageUrl,
            leaseType: deal.leaseType,
            vatIncluded: deal.vatIncluded,
            matchedCapCode: match.capCode,
            matchedVehicleId: match.vehicleId,
            matchConfidence: match.confidence.toString(),
            previousPrice: prevPrice,
            priceChange,
            priceChangePercent: priceChangePercent?.toFixed(2),
            rawData: deal.rawData,
          });
        }

        results.push({
          source: 'vipgateway',
          dealsCount: normalizedDeals.length,
          snapshotId: snapshot.id,
        });
      } catch (error) {
        console.error('Error fetching from VIP Gateway:', error);
        results.push({
          source: 'vipgateway',
          dealsCount: 0,
          snapshotId: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalDeals: results.reduce((sum, r) => sum + r.dealsCount, 0),
    });
  } catch (error) {
    console.error('Error in intelligence fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market intelligence data' },
      { status: 500 }
    );
  }
}
