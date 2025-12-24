import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratebookImports, providerRates } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * GET /api/admin/ratebooks/[importId]
 * Get details of a specific ratebook import
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { importId } = await params;

    // Get import record
    const [importRecord] = await db
      .select()
      .from(ratebookImports)
      .where(eq(ratebookImports.id, importId))
      .limit(1);

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    // Get rate statistics for this import
    const [rateStats] = await db
      .select({
        totalRates: sql<number>`count(*)`,
        uniqueVehicles: sql<number>`count(distinct ${providerRates.capCode})`,
        minRental: sql<number>`min(${providerRates.totalRental})`,
        maxRental: sql<number>`max(${providerRates.totalRental})`,
        avgRental: sql<number>`avg(${providerRates.totalRental})`,
      })
      .from(providerRates)
      .where(eq(providerRates.importId, importId));

    // Get fuel type breakdown
    const fuelTypeBreakdown = await db
      .select({
        fuelType: providerRates.fuelType,
        count: sql<number>`count(distinct ${providerRates.capCode})`,
      })
      .from(providerRates)
      .where(eq(providerRates.importId, importId))
      .groupBy(providerRates.fuelType);

    // Get term breakdown
    const termBreakdown = await db
      .select({
        term: providerRates.term,
        count: sql<number>`count(*)`,
      })
      .from(providerRates)
      .where(eq(providerRates.importId, importId))
      .groupBy(providerRates.term);

    // Get sample rates (top 10 cheapest)
    const sampleRates = await db
      .select({
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        term: providerRates.term,
        annualMileage: providerRates.annualMileage,
        totalRental: providerRates.totalRental,
        fuelType: providerRates.fuelType,
      })
      .from(providerRates)
      .where(eq(providerRates.importId, importId))
      .orderBy(providerRates.totalRental)
      .limit(10);

    return NextResponse.json({
      import: importRecord,
      stats: {
        totalRates: Number(rateStats?.totalRates || 0),
        uniqueVehicles: Number(rateStats?.uniqueVehicles || 0),
        minRentalGbp: rateStats?.minRental ? Number(rateStats.minRental) / 100 : 0,
        maxRentalGbp: rateStats?.maxRental ? Number(rateStats.maxRental) / 100 : 0,
        avgRentalGbp: rateStats?.avgRental ? Number(rateStats.avgRental) / 100 : 0,
      },
      fuelTypeBreakdown: fuelTypeBreakdown.map((f) => ({
        fuelType: f.fuelType || "Unknown",
        count: Number(f.count),
      })),
      termBreakdown: termBreakdown.map((t) => ({
        term: t.term,
        count: Number(t.count),
      })),
      sampleRates: sampleRates.map((r) => ({
        ...r,
        totalRentalGbp: r.totalRental / 100,
      })),
    });
  } catch (error) {
    console.error("Error fetching import details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch import" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ratebooks/[importId]
 * Delete a ratebook import and its rates
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { importId } = await params;

    // Check import exists
    const [importRecord] = await db
      .select()
      .from(ratebookImports)
      .where(eq(ratebookImports.id, importId))
      .limit(1);

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    // Delete rates first (cascades should handle this, but being explicit)
    await db.delete(providerRates).where(eq(providerRates.importId, importId));

    // Delete import record
    await db.delete(ratebookImports).where(eq(ratebookImports.id, importId));

    return NextResponse.json({
      success: true,
      message: `Deleted import ${importId} and all associated rates`,
    });
  } catch (error) {
    console.error("Error deleting import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete import" },
      { status: 500 }
    );
  }
}
