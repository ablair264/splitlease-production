import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fleetMarqueTerms } from "@/lib/db/schema";
import { eq, desc, sql, and, ilike, inArray } from "drizzle-orm";

export interface DiscountTerm {
  id: string;
  capCode: string;
  make: string;
  model: string;
  derivative: string | null;
  capPriceGbp: number;
  discountPercent: number | null;
  discountedPriceGbp: number | null;
  savingsGbp: number | null;
  co2: number | null;
  buildUrl: string | null;
  scrapedAt: string;
}

export interface DiscountStats {
  totalTerms: number;
  uniqueMakes: number;
  avgDiscountPercent: number;
  totalSavingsGbp: number;
}

export interface DiscountsResponse {
  terms: DiscountTerm[];
  stats: DiscountStats;
  makes: string[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GET /api/admin/discounts
 *
 * Returns fleet marque discount terms with filtering and pagination.
 *
 * Query params:
 * - page: page number (default 1)
 * - pageSize: items per page (default 50)
 * - make: filter by manufacturer
 * - search: search in model/derivative
 * - sortBy: field to sort by (default scrapedAt)
 * - sortOrder: asc or desc (default desc)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const makeFilter = searchParams.get("make");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "scrapedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build conditions
    const conditions = [];
    if (makeFilter) {
      conditions.push(eq(fleetMarqueTerms.make, makeFilter));
    }
    if (search) {
      conditions.push(
        sql`(${fleetMarqueTerms.model} ILIKE ${`%${search}%`} OR ${fleetMarqueTerms.derivative} ILIKE ${`%${search}%`})`
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fleetMarqueTerms)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Determine sort column
    let sortColumn;
    switch (sortBy) {
      case "make":
        sortColumn = fleetMarqueTerms.make;
        break;
      case "model":
        sortColumn = fleetMarqueTerms.model;
        break;
      case "discountPercent":
        sortColumn = fleetMarqueTerms.discountPercent;
        break;
      case "savings":
        sortColumn = fleetMarqueTerms.savings;
        break;
      case "capPrice":
        sortColumn = fleetMarqueTerms.capPrice;
        break;
      default:
        sortColumn = fleetMarqueTerms.scrapedAt;
    }

    // Fetch terms
    const termsResult = await db
      .select({
        id: fleetMarqueTerms.id,
        capCode: fleetMarqueTerms.capCode,
        make: fleetMarqueTerms.make,
        model: fleetMarqueTerms.model,
        derivative: fleetMarqueTerms.derivative,
        capPrice: fleetMarqueTerms.capPrice,
        discountPercent: fleetMarqueTerms.discountPercent,
        discountedPrice: fleetMarqueTerms.discountedPrice,
        savings: fleetMarqueTerms.savings,
        co2: fleetMarqueTerms.co2,
        buildUrl: fleetMarqueTerms.buildUrl,
        scrapedAt: fleetMarqueTerms.scrapedAt,
      })
      .from(fleetMarqueTerms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? sortColumn : desc(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Transform to response format
    const terms: DiscountTerm[] = termsResult.map((t) => ({
      id: t.id,
      capCode: t.capCode,
      make: t.make,
      model: t.model,
      derivative: t.derivative,
      capPriceGbp: (t.capPrice || 0) / 100,
      discountPercent: t.discountPercent ? parseFloat(t.discountPercent) : null,
      discountedPriceGbp: t.discountedPrice ? t.discountedPrice / 100 : null,
      savingsGbp: t.savings ? t.savings / 100 : null,
      co2: t.co2,
      buildUrl: t.buildUrl,
      scrapedAt: t.scrapedAt.toISOString(),
    }));

    // Get unique makes for filter dropdown
    const makesResult = await db
      .selectDistinct({ make: fleetMarqueTerms.make })
      .from(fleetMarqueTerms)
      .orderBy(fleetMarqueTerms.make);

    const makes = makesResult.map((m) => m.make);

    // Calculate stats
    const [statsResult] = await db
      .select({
        totalTerms: sql<number>`count(*)::int`,
        uniqueMakes: sql<number>`count(distinct ${fleetMarqueTerms.make})::int`,
        avgDiscountPercent: sql<number>`coalesce(avg(${fleetMarqueTerms.discountPercent}::numeric), 0)`,
        totalSavings: sql<number>`coalesce(sum(${fleetMarqueTerms.savings}), 0)::int`,
      })
      .from(fleetMarqueTerms);

    const stats: DiscountStats = {
      totalTerms: statsResult?.totalTerms || 0,
      uniqueMakes: statsResult?.uniqueMakes || 0,
      avgDiscountPercent: Math.round((statsResult?.avgDiscountPercent || 0) * 10) / 10,
      totalSavingsGbp: (statsResult?.totalSavings || 0) / 100,
    };

    const response: DiscountsResponse = {
      terms,
      stats,
      makes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}
