import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fleetMarqueTerms } from "@/lib/db/schema";
import { and, isNotNull, gt, lte, desc, sql } from "drizzle-orm";

interface ExpiringDiscount {
  id: string;
  capCode: string;
  make: string;
  model: string;
  derivative: string | null;
  discountPercent: number;
  savingsGbp: number;
  expiresAt: string;
  daysUntilExpiry: number;
  status: "critical" | "warning" | "upcoming";
}

interface ExpiringDiscountsResponse {
  discounts: ExpiringDiscount[];
  summary: {
    expiringSoon: number;
    expiringThisWeek: number;
    expiringThisMonth: number;
    totalSavingsAtRisk: number;
  };
}

/**
 * GET /api/admin/discounts/expiring
 *
 * Returns discounts that are expiring soon.
 *
 * Query params:
 * - days: number of days to look ahead (default 30)
 * - limit: max items to return (default 20)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "20");

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Get discounts expiring within the date range
    const result = await db
      .select({
        id: fleetMarqueTerms.id,
        capCode: fleetMarqueTerms.capCode,
        make: fleetMarqueTerms.make,
        model: fleetMarqueTerms.model,
        derivative: fleetMarqueTerms.derivative,
        discountPercent: fleetMarqueTerms.discountPercent,
        savings: fleetMarqueTerms.savings,
        expiresAt: fleetMarqueTerms.expiresAt,
      })
      .from(fleetMarqueTerms)
      .where(
        and(
          isNotNull(fleetMarqueTerms.expiresAt),
          gt(fleetMarqueTerms.expiresAt, now),
          lte(fleetMarqueTerms.expiresAt, endDate)
        )
      )
      .orderBy(fleetMarqueTerms.expiresAt)
      .limit(limit);

    // Calculate days until expiry and status for each discount
    const discounts: ExpiringDiscount[] = result.map((d) => {
      const expiresAt = d.expiresAt!;
      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let status: ExpiringDiscount["status"];
      if (daysUntilExpiry <= 1) {
        status = "critical";
      } else if (daysUntilExpiry <= 7) {
        status = "warning";
      } else {
        status = "upcoming";
      }

      return {
        id: d.id,
        capCode: d.capCode,
        make: d.make,
        model: d.model,
        derivative: d.derivative,
        discountPercent: parseFloat(d.discountPercent || "0"),
        savingsGbp: Math.round((d.savings || 0) / 100),
        expiresAt: expiresAt.toISOString(),
        daysUntilExpiry,
        status,
      };
    });

    // Calculate summary
    const summary = {
      expiringSoon: discounts.filter((d) => d.daysUntilExpiry <= 1).length,
      expiringThisWeek: discounts.filter((d) => d.daysUntilExpiry <= 7).length,
      expiringThisMonth: discounts.length,
      totalSavingsAtRisk: discounts.reduce((sum, d) => sum + d.savingsGbp, 0),
    };

    const response: ExpiringDiscountsResponse = {
      discounts,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching expiring discounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}
