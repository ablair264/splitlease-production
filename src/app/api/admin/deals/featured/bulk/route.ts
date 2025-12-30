import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { featuredDeals, providerRates, ratebookImports, vehicles } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export type BulkAction = "feature" | "unfeature" | "approve" | "reject" | "expire";

export interface BulkActionRequest {
  action: BulkAction;
  capCodes?: string[]; // For "feature" action
  dealIds?: string[]; // For other actions
  rejectionReason?: string; // For "reject" action
  expiresAt?: string; // For "feature" and "approve" actions
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * POST /api/admin/deals/featured/bulk
 *
 * Perform bulk actions on featured deals.
 *
 * Body:
 * - action: "feature" | "unfeature" | "approve" | "reject" | "expire"
 * - capCodes: string[] (for "feature" action)
 * - dealIds: string[] (for other actions)
 * - rejectionReason: string (optional, for "reject")
 * - expiresAt: string (optional, for "feature" and "approve")
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: BulkActionRequest = await req.json();
    const { action, capCodes, dealIds, rejectionReason, expiresAt } = body;

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    if (action === "feature" && capCodes && capCodes.length > 0) {
      // Bulk feature vehicles by CAP code
      for (const capCode of capCodes) {
        try {
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
            errors.push(`Vehicle not found for CAP code: ${capCode}`);
            failed++;
            continue;
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

          // Check if already featured
          const existing = await db
            .select({ id: featuredDeals.id })
            .from(featuredDeals)
            .where(
              and(
                eq(featuredDeals.capCode, capCode),
                eq(featuredDeals.isActive, true)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            errors.push(`Already featured: ${capCode}`);
            failed++;
            continue;
          }

          await db.insert(featuredDeals).values({
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
          });

          processed++;
        } catch (err) {
          errors.push(`Error featuring ${capCode}: ${err instanceof Error ? err.message : "Unknown"}`);
          failed++;
        }
      }
    } else if (dealIds && dealIds.length > 0) {
      // Bulk actions on existing deals
      switch (action) {
        case "unfeature":
          await db
            .update(featuredDeals)
            .set({
              isActive: false,
              unfeaturedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(inArray(featuredDeals.id, dealIds));
          processed = dealIds.length;
          break;

        case "approve":
          await db
            .update(featuredDeals)
            .set({
              status: "approved",
              isActive: true,
              approvedBy: session.user.id,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              updatedAt: new Date(),
            })
            .where(inArray(featuredDeals.id, dealIds));
          processed = dealIds.length;
          break;

        case "reject":
          await db
            .update(featuredDeals)
            .set({
              status: "rejected",
              isActive: false,
              rejectedBy: session.user.id,
              rejectionReason: rejectionReason || null,
              updatedAt: new Date(),
            })
            .where(inArray(featuredDeals.id, dealIds));
          processed = dealIds.length;
          break;

        case "expire":
          await db
            .update(featuredDeals)
            .set({
              status: "expired",
              isActive: false,
              unfeaturedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(inArray(featuredDeals.id, dealIds));
          processed = dealIds.length;
          break;

        default:
          return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Missing capCodes or dealIds" },
        { status: 400 }
      );
    }

    const response: BulkActionResponse = {
      success: failed === 0,
      processed,
      failed,
      errors,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
