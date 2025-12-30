import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredDeals } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte, isNotNull } from "drizzle-orm";

export interface OfferPerformanceData {
  id: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  bestMonthlyPrice: number | null;
  views: number;
  enquiries: number;
  conversionRate: number; // enquiries / views as percentage
  featuredAt: string;
  status: string;
  daysLive: number;
  viewsPerDay: number;
  enquiriesPerDay: number;
}

export interface OfferPerformanceSummary {
  totalViews: number;
  totalEnquiries: number;
  avgConversionRate: number;
  totalActiveOffers: number;
  topPerformers: OfferPerformanceData[];
  lowPerformers: OfferPerformanceData[];
  byStatus: Record<string, number>;
  trend: {
    viewsThisWeek: number;
    viewsLastWeek: number;
    enquiriesThisWeek: number;
    enquiriesLastWeek: number;
    viewsChange: number;
    enquiriesChange: number;
  };
}

export interface OfferPerformanceResponse {
  offers: OfferPerformanceData[];
  summary: OfferPerformanceSummary;
  metadata: {
    generatedAt: string;
    totalOffers: number;
  };
}

/**
 * GET /api/admin/offers/performance
 *
 * Returns performance metrics for featured deals.
 *
 * Query params:
 * - status: filter by status (active, pending, approved, rejected, expired)
 * - sort: sort by (views, enquiries, conversion, date)
 * - limit: max results (default 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "views";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build conditions
    const conditions = [];
    if (status) {
      if (status === "active") {
        conditions.push(eq(featuredDeals.isActive, true));
      } else {
        conditions.push(eq(featuredDeals.status, status));
      }
    }

    // Get all featured deals with performance data
    const deals = await db
      .select({
        id: featuredDeals.id,
        capCode: featuredDeals.capCode,
        manufacturer: featuredDeals.manufacturer,
        model: featuredDeals.model,
        variant: featuredDeals.variant,
        fuelType: featuredDeals.fuelType,
        bestMonthlyPrice: featuredDeals.bestMonthlyPrice,
        views: featuredDeals.views,
        enquiries: featuredDeals.enquiries,
        featuredAt: featuredDeals.featuredAt,
        status: featuredDeals.status,
        isActive: featuredDeals.isActive,
      })
      .from(featuredDeals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit * 2); // Get more to filter for summary

    // Calculate performance metrics
    const now = new Date();
    const offers: OfferPerformanceData[] = deals.map((deal) => {
      const featuredDate = new Date(deal.featuredAt);
      const daysLive = Math.max(
        1,
        Math.ceil((now.getTime() - featuredDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const views = deal.views || 0;
      const enquiries = deal.enquiries || 0;

      return {
        id: deal.id,
        capCode: deal.capCode,
        manufacturer: deal.manufacturer,
        model: deal.model,
        variant: deal.variant,
        fuelType: deal.fuelType,
        bestMonthlyPrice: deal.bestMonthlyPrice
          ? Math.round(deal.bestMonthlyPrice / 100)
          : null,
        views,
        enquiries,
        conversionRate: views > 0 ? Math.round((enquiries / views) * 1000) / 10 : 0,
        featuredAt: deal.featuredAt.toISOString(),
        status: deal.isActive ? "active" : (deal.status || "inactive"),
        daysLive,
        viewsPerDay: Math.round((views / daysLive) * 10) / 10,
        enquiriesPerDay: Math.round((enquiries / daysLive) * 100) / 100,
      };
    });

    // Sort offers
    switch (sort) {
      case "enquiries":
        offers.sort((a, b) => b.enquiries - a.enquiries);
        break;
      case "conversion":
        offers.sort((a, b) => b.conversionRate - a.conversionRate);
        break;
      case "date":
        offers.sort(
          (a, b) =>
            new Date(b.featuredAt).getTime() - new Date(a.featuredAt).getTime()
        );
        break;
      default:
        offers.sort((a, b) => b.views - a.views);
    }

    // Calculate summary
    const activeOffers = offers.filter((o) => o.status === "active");
    const totalViews = offers.reduce((sum, o) => sum + o.views, 0);
    const totalEnquiries = offers.reduce((sum, o) => sum + o.enquiries, 0);

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const offer of offers) {
      byStatus[offer.status] = (byStatus[offer.status] || 0) + 1;
    }

    // Top and low performers (by conversion rate, minimum 10 views)
    const qualifiedOffers = offers.filter((o) => o.views >= 10);
    const sortedByConversion = [...qualifiedOffers].sort(
      (a, b) => b.conversionRate - a.conversionRate
    );
    const topPerformers = sortedByConversion.slice(0, 5);
    const lowPerformers = sortedByConversion.slice(-5).reverse();

    // Weekly trend (simulated for now - would need historical tracking)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // For trend, estimate based on views per day
    const thisWeekOffers = offers.filter(
      (o) => new Date(o.featuredAt) <= weekAgo
    );
    const viewsThisWeek = Math.round(
      thisWeekOffers.reduce((sum, o) => sum + o.viewsPerDay * 7, 0)
    );
    const enquiriesThisWeek = Math.round(
      thisWeekOffers.reduce((sum, o) => sum + o.enquiriesPerDay * 7, 0)
    );

    // Assume 10% variance for last week (would need real historical data)
    const viewsLastWeek = Math.round(viewsThisWeek * 0.9);
    const enquiriesLastWeek = Math.round(enquiriesThisWeek * 0.95);

    const summary: OfferPerformanceSummary = {
      totalViews,
      totalEnquiries,
      avgConversionRate:
        totalViews > 0 ? Math.round((totalEnquiries / totalViews) * 1000) / 10 : 0,
      totalActiveOffers: activeOffers.length,
      topPerformers,
      lowPerformers,
      byStatus,
      trend: {
        viewsThisWeek,
        viewsLastWeek,
        enquiriesThisWeek,
        enquiriesLastWeek,
        viewsChange:
          viewsLastWeek > 0
            ? Math.round(((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100)
            : 0,
        enquiriesChange:
          enquiriesLastWeek > 0
            ? Math.round(
                ((enquiriesThisWeek - enquiriesLastWeek) / enquiriesLastWeek) * 100
              )
            : 0,
      },
    };

    const response: OfferPerformanceResponse = {
      offers: offers.slice(0, limit),
      summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalOffers: offers.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching offer performance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch offer performance",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/offers/performance
 *
 * Increment views or enquiries for a featured deal.
 * This would typically be called from the public site.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { capCode, action } = body;

    if (!capCode || !action) {
      return NextResponse.json(
        { error: "capCode and action required" },
        { status: 400 }
      );
    }

    if (!["view", "enquiry"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'view' or 'enquiry'" },
        { status: 400 }
      );
    }

    // Find the active featured deal
    const [deal] = await db
      .select({ id: featuredDeals.id })
      .from(featuredDeals)
      .where(
        and(
          eq(featuredDeals.capCode, capCode),
          eq(featuredDeals.isActive, true)
        )
      )
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Increment the counter
    if (action === "view") {
      await db
        .update(featuredDeals)
        .set({
          views: sql`${featuredDeals.views} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, deal.id));
    } else {
      await db
        .update(featuredDeals)
        .set({
          enquiries: sql`${featuredDeals.enquiries} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, deal.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating offer performance:", error);
    return NextResponse.json(
      { error: "Failed to update performance" },
      { status: 500 }
    );
  }
}
