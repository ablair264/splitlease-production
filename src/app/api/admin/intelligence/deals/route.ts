import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  marketIntelligenceSnapshots,
  marketIntelligenceDeals,
} from '@/lib/db/schema';
import { eq, desc, and, gte, lte, ilike, or, inArray, isNotNull } from 'drizzle-orm';

/**
 * GET /api/admin/intelligence/deals
 * Retrieve competitor deals with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const source = searchParams.get('source'); // 'leasing_com' | 'leaseloco' | null (all)
    const manufacturer = searchParams.get('manufacturer');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!) * 100
      : null;
    const maxPrice = searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!) * 100
      : null;
    const matchedOnly = searchParams.get('matchedOnly') === 'true';
    const snapshotId = searchParams.get('snapshotId');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // If no snapshotId, get the latest snapshot(s)
    let snapshotIds: string[] = [];

    if (snapshotId) {
      snapshotIds = [snapshotId];
    } else {
      // Get latest snapshot for each source
      const sources = source
        ? [source]
        : [
            'leasing_com',
            'leaseloco',
            'appliedleasing',
            'selectcarleasing',
            'vipgateway',
          ];

      for (const src of sources) {
        const latestSnapshot = await db
          .select({ id: marketIntelligenceSnapshots.id })
          .from(marketIntelligenceSnapshots)
          .where(eq(marketIntelligenceSnapshots.source, src))
          .orderBy(desc(marketIntelligenceSnapshots.snapshotDate))
          .limit(1);

        if (latestSnapshot[0]) {
          snapshotIds.push(latestSnapshot[0].id);
        }
      }
    }

    if (snapshotIds.length === 0) {
      return NextResponse.json({
        deals: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        snapshots: [],
      });
    }

    // Build conditions
    const conditions = [inArray(marketIntelligenceDeals.snapshotId, snapshotIds)];

    if (manufacturer) {
      conditions.push(ilike(marketIntelligenceDeals.manufacturer, manufacturer));
    }

    if (search) {
      conditions.push(
        or(
          ilike(marketIntelligenceDeals.manufacturer, `%${search}%`),
          ilike(marketIntelligenceDeals.model, `%${search}%`),
          ilike(marketIntelligenceDeals.variant, `%${search}%`)
        )!
      );
    }

    if (minPrice !== null) {
      conditions.push(gte(marketIntelligenceDeals.monthlyPrice, minPrice));
    }

    if (maxPrice !== null) {
      conditions.push(lte(marketIntelligenceDeals.monthlyPrice, maxPrice));
    }

    if (matchedOnly) {
      conditions.push(isNotNull(marketIntelligenceDeals.matchedVehicleId));
      conditions.push(gte(marketIntelligenceDeals.matchConfidence, '50'));
    }

    // Get deals
    const deals = await db
      .select()
      .from(marketIntelligenceDeals)
      .where(and(...conditions))
      .orderBy(desc(marketIntelligenceDeals.monthlyPrice))
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const allDeals = await db
      .select({ id: marketIntelligenceDeals.id })
      .from(marketIntelligenceDeals)
      .where(and(...conditions));

    const total = allDeals.length;

    // Get snapshot info
    const snapshots = await db
      .select()
      .from(marketIntelligenceSnapshots)
      .where(inArray(marketIntelligenceSnapshots.id, snapshotIds));

    // Format deals for response
    const formattedDeals = deals.map((deal) => ({
      id: deal.id,
      source: deal.source,
      manufacturer: deal.manufacturer,
      model: deal.model,
      variant: deal.variant,
      bodyType: deal.bodyType,
      fuelType: deal.fuelType,
      monthlyPriceGbp: Math.round(deal.monthlyPrice / 100),
      initialPaymentGbp: deal.initialPayment
        ? Math.round(deal.initialPayment / 100)
        : null,
      term: deal.term,
      annualMileage: deal.annualMileage,
      valueScore: deal.valueScore,
      dealCount: deal.dealCount,
      stockStatus: deal.stockStatus,
      imageUrl: deal.imageUrl,
      leaseType: deal.leaseType,
      vatIncluded: deal.vatIncluded,
      // Matching info
      matchedCapCode: deal.matchedCapCode,
      matchedVehicleId: deal.matchedVehicleId,
      matchConfidence: deal.matchConfidence
        ? parseFloat(deal.matchConfidence)
        : null,
      // Trend info
      previousPriceGbp: deal.previousPrice
        ? Math.round(deal.previousPrice / 100)
        : null,
      priceChangeGbp: deal.priceChange
        ? Math.round(deal.priceChange / 100)
        : null,
      priceChangePercent: deal.priceChangePercent
        ? parseFloat(deal.priceChangePercent)
        : null,
      createdAt: deal.createdAt,
    }));

    return NextResponse.json({
      deals: formattedDeals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      snapshots: snapshots.map((s) => ({
        id: s.id,
        source: s.source,
        snapshotDate: s.snapshotDate,
        totalDealsCount: s.totalDealsCount,
        avgMonthlyPriceGbp: s.avgMonthlyPrice
          ? Math.round(s.avgMonthlyPrice / 100)
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching intelligence deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}
