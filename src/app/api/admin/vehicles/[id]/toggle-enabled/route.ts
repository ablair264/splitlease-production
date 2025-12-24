import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleStatus } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Toggle vehicle enabled status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const body = await request.json();
    const { enabled, reason } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled field is required and must be a boolean" },
        { status: 400 }
      );
    }

    // Check if status record exists
    const existing = await db
      .select()
      .from(vehicleStatus)
      .where(eq(vehicleStatus.vehicleId, vehicleId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(vehicleStatus)
        .set({
          isEnabled: enabled,
          disabledAt: enabled ? null : new Date(),
          disabledReason: enabled ? null : (reason || null),
          updatedAt: new Date(),
        })
        .where(eq(vehicleStatus.vehicleId, vehicleId));
    } else {
      // Create new record
      await db.insert(vehicleStatus).values({
        vehicleId,
        isEnabled: enabled,
        disabledAt: enabled ? null : new Date(),
        disabledReason: enabled ? null : (reason || null),
        isSpecialOffer: false,
      });
    }

    return NextResponse.json({
      success: true,
      isEnabled: enabled,
      message: enabled
        ? "Vehicle has been enabled on the website"
        : "Vehicle has been disabled on the website",
    });
  } catch (error) {
    console.error("Error toggling vehicle enabled status:", error);
    return NextResponse.json(
      { error: "Failed to toggle vehicle enabled status" },
      { status: 500 }
    );
  }
}

// GET - Get vehicle enabled status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;

    const existing = await db
      .select({
        isEnabled: vehicleStatus.isEnabled,
        disabledAt: vehicleStatus.disabledAt,
        disabledReason: vehicleStatus.disabledReason,
      })
      .from(vehicleStatus)
      .where(eq(vehicleStatus.vehicleId, vehicleId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        isEnabled: true,
        disabledAt: null,
        disabledReason: null,
      });
    }

    return NextResponse.json(existing[0]);
  } catch (error) {
    console.error("Error getting vehicle enabled status:", error);
    return NextResponse.json(
      { error: "Failed to get vehicle enabled status" },
      { status: 500 }
    );
  }
}
