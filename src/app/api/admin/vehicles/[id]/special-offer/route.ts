import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleStatus } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Mark vehicle as special offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

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
          isSpecialOffer: true,
          specialOfferAt: new Date(),
          specialOfferNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(vehicleStatus.vehicleId, vehicleId));
    } else {
      // Create new record
      await db.insert(vehicleStatus).values({
        vehicleId,
        isSpecialOffer: true,
        specialOfferAt: new Date(),
        specialOfferNotes: notes || null,
        isEnabled: true,
      });
    }

    return NextResponse.json({ success: true, isSpecialOffer: true });
  } catch (error) {
    console.error("Error marking vehicle as special offer:", error);
    return NextResponse.json(
      { error: "Failed to mark vehicle as special offer" },
      { status: 500 }
    );
  }
}

// DELETE - Remove special offer status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;

    // Check if status record exists
    const existing = await db
      .select()
      .from(vehicleStatus)
      .where(eq(vehicleStatus.vehicleId, vehicleId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(vehicleStatus)
        .set({
          isSpecialOffer: false,
          specialOfferAt: null,
          specialOfferNotes: null,
          updatedAt: new Date(),
        })
        .where(eq(vehicleStatus.vehicleId, vehicleId));
    }

    return NextResponse.json({ success: true, isSpecialOffer: false });
  } catch (error) {
    console.error("Error removing special offer status:", error);
    return NextResponse.json(
      { error: "Failed to remove special offer status" },
      { status: 500 }
    );
  }
}

// GET - Get special offer status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;

    const existing = await db
      .select({
        isSpecialOffer: vehicleStatus.isSpecialOffer,
        specialOfferAt: vehicleStatus.specialOfferAt,
        specialOfferNotes: vehicleStatus.specialOfferNotes,
      })
      .from(vehicleStatus)
      .where(eq(vehicleStatus.vehicleId, vehicleId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        isSpecialOffer: false,
        specialOfferAt: null,
        specialOfferNotes: null,
      });
    }

    return NextResponse.json(existing[0]);
  } catch (error) {
    console.error("Error getting special offer status:", error);
    return NextResponse.json(
      { error: "Failed to get special offer status" },
      { status: 500 }
    );
  }
}
