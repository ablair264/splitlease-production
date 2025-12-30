import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredDeals, providerRates, ratebookImports, vehicles, users } from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, isNull, or, gt } from "drizzle-orm";

export type QueueStatus = "pending" | "approved" | "rejected" | "expired";

export interface QueueItem {
  id: string;
  capCode: string;
  vehicleId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  bestMonthlyPriceGbp: number;
  bestTerm: number | null;
  bestMileage: number | null;
  bestProviderCode: string | null;
  contractType: string | null;
  score: number;
  status: QueueStatus;
  featuredAt: string;
  expiresAt: string | null;
  featuredByName: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  views: number;
  enquiries: number;
  currentPrice: number | null; // Current best price (may have changed)
  priceChange: number | null; // Difference from featured price
}

export interface QueueSuggestion {
  capCode: string;
  vehicleId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  bestMonthlyPriceGbp: number;
  bestTerm: number;
  bestMileage: number;
  bestProviderCode: string;
  contractType: string;
  score: number;
  p11dGbp: number;
  reason: string;
}

export interface QueueResponse {
  queue: QueueItem[];
  suggestions: QueueSuggestion[];
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    totalViews: number;
    totalEnquiries: number;
  };
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/deals/queue
 *
 * Returns the special offers queue with suggestions for new deals.
 *
 * Query params:
 * - status: filter by status (pending, approved, rejected, expired)
 * - limit: max items to return (default 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") as QueueStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build conditions
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(featuredDeals.status, statusFilter));
    }

    // Get queue items with user info
    const queueResult = await db
      .select({
        id: featuredDeals.id,
        capCode: featuredDeals.capCode,
        vehicleId: featuredDeals.vehicleId,
        manufacturer: featuredDeals.manufacturer,
        model: featuredDeals.model,
        variant: featuredDeals.variant,
        fuelType: featuredDeals.fuelType,
        bestMonthlyPrice: featuredDeals.bestMonthlyPrice,
        bestTerm: featuredDeals.bestTerm,
        bestMileage: featuredDeals.bestMileage,
        bestProviderCode: featuredDeals.bestProviderCode,
        contractType: featuredDeals.contractType,
        score: featuredDeals.scoreAtFeaturing,
        status: featuredDeals.status,
        featuredAt: featuredDeals.featuredAt,
        expiresAt: featuredDeals.expiresAt,
        rejectionReason: featuredDeals.rejectionReason,
        views: featuredDeals.views,
        enquiries: featuredDeals.enquiries,
        featuredBy: featuredDeals.featuredBy,
        approvedBy: featuredDeals.approvedBy,
      })
      .from(featuredDeals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(featuredDeals.featuredAt))
      .limit(limit);

    // Get user names for featuredBy and approvedBy
    const userIds = [
      ...new Set(
        queueResult
          .flatMap((q) => [q.featuredBy, q.approvedBy])
          .filter((id): id is string => id !== null)
      ),
    ];

    let userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const usersResult = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds));

      userMap = new Map(usersResult.map((u) => [u.id, u.name || u.email || "Unknown"]));
    }

    // Get current prices for these cap codes
    const capCodes = queueResult.map((q) => q.capCode);
    let currentPriceMap = new Map<string, number>();

    if (capCodes.length > 0) {
      const currentPrices = await db
        .select({
          capCode: providerRates.capCode,
          minPrice: sql<number>`min(${providerRates.totalRental})::int`,
        })
        .from(providerRates)
        .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
        .where(
          and(
            inArray(providerRates.capCode, capCodes),
            eq(ratebookImports.isLatest, true)
          )
        )
        .groupBy(providerRates.capCode);

      currentPriceMap = new Map(
        currentPrices.map((p) => [p.capCode!, Math.round(p.minPrice / 100)])
      );
    }

    // Transform queue items
    const queue: QueueItem[] = queueResult.map((q) => {
      const featuredPrice = q.bestMonthlyPrice ? Math.round(q.bestMonthlyPrice / 100) : 0;
      const currentPrice = currentPriceMap.get(q.capCode) || null;
      const priceChange = currentPrice && featuredPrice ? currentPrice - featuredPrice : null;

      return {
        id: q.id,
        capCode: q.capCode,
        vehicleId: q.vehicleId,
        manufacturer: q.manufacturer,
        model: q.model,
        variant: q.variant,
        fuelType: q.fuelType,
        bestMonthlyPriceGbp: featuredPrice,
        bestTerm: q.bestTerm,
        bestMileage: q.bestMileage,
        bestProviderCode: q.bestProviderCode,
        contractType: q.contractType,
        score: q.score || 0,
        status: (q.status || "pending") as QueueStatus,
        featuredAt: q.featuredAt.toISOString(),
        expiresAt: q.expiresAt?.toISOString() || null,
        featuredByName: q.featuredBy ? userMap.get(q.featuredBy) || null : null,
        approvedByName: q.approvedBy ? userMap.get(q.approvedBy) || null : null,
        rejectionReason: q.rejectionReason,
        views: q.views || 0,
        enquiries: q.enquiries || 0,
        currentPrice,
        priceChange,
      };
    });

    // Get high-score suggestions (vehicles not currently in queue)
    const existingCapCodes = queueResult.map((q) => q.capCode);

    const suggestionsResult = await db
      .select({
        capCode: providerRates.capCode,
        vehicleId: providerRates.vehicleId,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        minPrice: sql<number>`min(${providerRates.totalRental})::int`,
        bestProvider: sql<string>`(array_agg(${providerRates.providerCode} ORDER BY ${providerRates.totalRental}))[1]`,
        bestTerm: sql<number>`(array_agg(${providerRates.term} ORDER BY ${providerRates.totalRental}))[1]`,
        bestMileage: sql<number>`(array_agg(${providerRates.annualMileage} ORDER BY ${providerRates.totalRental}))[1]`,
        bestContract: sql<string>`(array_agg(${providerRates.contractType} ORDER BY ${providerRates.totalRental}))[1]`,
        maxScore: sql<number>`max(${providerRates.score})::int`,
      })
      .from(providerRates)
      .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
      .where(
        and(
          eq(ratebookImports.isLatest, true),
          gt(providerRates.score, 75) // Only high-score deals
        )
      )
      .groupBy(
        providerRates.capCode,
        providerRates.vehicleId,
        providerRates.manufacturer,
        providerRates.model,
        providerRates.variant
      )
      .orderBy(desc(sql`max(${providerRates.score})`))
      .limit(20);

    // Get vehicle P11D values
    const suggestionVehicleIds = suggestionsResult
      .map((s) => s.vehicleId)
      .filter((id): id is string => id !== null);

    let vehicleP11dMap = new Map<string, number>();
    if (suggestionVehicleIds.length > 0) {
      const vehicleData = await db
        .select({ id: vehicles.id, p11d: vehicles.p11d, fuelType: vehicles.fuelType })
        .from(vehicles)
        .where(inArray(vehicles.id, suggestionVehicleIds));

      vehicleP11dMap = new Map(vehicleData.map((v) => [v.id, v.p11d || 0]));
    }

    // Filter out existing and transform suggestions
    const suggestions: QueueSuggestion[] = suggestionsResult
      .filter((s) => s.capCode && !existingCapCodes.includes(s.capCode))
      .slice(0, 10)
      .map((s) => {
        const p11d = s.vehicleId ? vehicleP11dMap.get(s.vehicleId) || 0 : 0;
        const score = s.maxScore || 0;

        let reason = "High value score";
        if (score >= 90) reason = "Exceptional value - top tier deal";
        else if (score >= 80) reason = "Excellent value proposition";
        else if (score >= 75) reason = "Great value for money";

        return {
          capCode: s.capCode!,
          vehicleId: s.vehicleId,
          manufacturer: s.manufacturer,
          model: s.model,
          variant: s.variant,
          fuelType: null, // Would need join to get this
          bestMonthlyPriceGbp: Math.round(s.minPrice / 100),
          bestTerm: s.bestTerm,
          bestMileage: s.bestMileage,
          bestProviderCode: s.bestProvider,
          contractType: s.bestContract,
          score,
          p11dGbp: Math.round(p11d / 100),
          reason,
        };
      });

    // Calculate stats
    const stats = {
      pending: queue.filter((q) => q.status === "pending").length,
      approved: queue.filter((q) => q.status === "approved").length,
      rejected: queue.filter((q) => q.status === "rejected").length,
      expired: queue.filter((q) => q.status === "expired").length,
      totalViews: queue.reduce((sum, q) => sum + q.views, 0),
      totalEnquiries: queue.reduce((sum, q) => sum + q.enquiries, 0),
    };

    const response: QueueResponse = {
      queue,
      suggestions,
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching deals queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/deals/queue
 *
 * Add a deal to the queue or update its status.
 *
 * Body:
 * - action: "add" | "approve" | "reject" | "expire"
 * - dealId: string (for approve/reject/expire)
 * - capCode: string (for add)
 * - rejectionReason: string (for reject)
 * - expiresAt: string (optional, for add/approve)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, dealId, capCode, rejectionReason, expiresAt } = body;

    if (action === "approve" && dealId) {
      await db
        .update(featuredDeals)
        .set({
          status: "approved",
          isActive: true,
          approvedBy: session.user.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, dealId));

      return NextResponse.json({ success: true, message: "Deal approved" });
    }

    if (action === "reject" && dealId) {
      await db
        .update(featuredDeals)
        .set({
          status: "rejected",
          isActive: false,
          rejectedBy: session.user.id,
          rejectionReason: rejectionReason || null,
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, dealId));

      return NextResponse.json({ success: true, message: "Deal rejected" });
    }

    if (action === "expire" && dealId) {
      await db
        .update(featuredDeals)
        .set({
          status: "expired",
          isActive: false,
          unfeaturedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(featuredDeals.id, dealId));

      return NextResponse.json({ success: true, message: "Deal expired" });
    }

    if (action === "add" && capCode) {
      // Get vehicle info for the cap code
      const [rateInfo] = await db
        .select({
          vehicleId: providerRates.vehicleId,
          manufacturer: providerRates.manufacturer,
          model: providerRates.model,
          variant: providerRates.variant,
          minPrice: sql<number>`min(${providerRates.totalRental})::int`,
          bestProvider: sql<string>`(array_agg(${providerRates.providerCode} ORDER BY ${providerRates.totalRental}))[1]`,
          bestTerm: sql<number>`(array_agg(${providerRates.term} ORDER BY ${providerRates.totalRental}))[1]`,
          bestMileage: sql<number>`(array_agg(${providerRates.annualMileage} ORDER BY ${providerRates.totalRental}))[1]`,
          bestContract: sql<string>`(array_agg(${providerRates.contractType} ORDER BY ${providerRates.totalRental}))[1]`,
          maxScore: sql<number>`max(${providerRates.score})::int`,
        })
        .from(providerRates)
        .innerJoin(ratebookImports, eq(providerRates.importId, ratebookImports.id))
        .where(
          and(
            eq(providerRates.capCode, capCode),
            eq(ratebookImports.isLatest, true)
          )
        )
        .groupBy(
          providerRates.vehicleId,
          providerRates.manufacturer,
          providerRates.model,
          providerRates.variant
        );

      if (!rateInfo) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      // Get fuel type from vehicles table
      let fuelType = null;
      if (rateInfo.vehicleId) {
        const [vehicle] = await db
          .select({ fuelType: vehicles.fuelType })
          .from(vehicles)
          .where(eq(vehicles.id, rateInfo.vehicleId));
        fuelType = vehicle?.fuelType || null;
      }

      const [newDeal] = await db
        .insert(featuredDeals)
        .values({
          capCode,
          vehicleId: rateInfo.vehicleId,
          manufacturer: rateInfo.manufacturer,
          model: rateInfo.model,
          variant: rateInfo.variant,
          fuelType,
          bestProviderCode: rateInfo.bestProvider,
          bestMonthlyPrice: rateInfo.minPrice,
          bestTerm: rateInfo.bestTerm,
          bestMileage: rateInfo.bestMileage,
          contractType: rateInfo.bestContract,
          scoreAtFeaturing: rateInfo.maxScore,
          status: "pending",
          isActive: false,
          featuredBy: session.user.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

      return NextResponse.json({ success: true, deal: newDeal });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating deals queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update queue" },
      { status: 500 }
    );
  }
}
