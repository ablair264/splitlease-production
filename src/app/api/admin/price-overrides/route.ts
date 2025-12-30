import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceOverrides, users, vehicles } from "@/lib/db/schema";
import { eq, and, desc, or, isNull, gt, sql, inArray } from "drizzle-orm";

export type PriceOverrideType = "fixed" | "percentage" | "absolute";

export interface PriceOverride {
  id: string;
  capCode: string | null;
  providerCode: string | null;
  contractType: string | null;
  term: number | null;
  annualMileage: number | null;
  overrideType: PriceOverrideType;
  overrideValuePence: number;
  overrideValueGbp: number;
  reason: string | null;
  internalNotes: string | null;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  priority: number;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  // Derived vehicle info
  vehicleInfo: {
    manufacturer: string;
    model: string;
    variant: string | null;
  } | null;
}

export interface PriceOverridesResponse {
  overrides: PriceOverride[];
  total: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

/**
 * GET /api/admin/price-overrides
 *
 * Returns all price overrides, optionally filtered.
 *
 * Query params:
 * - capCode: filter by CAP code
 * - providerCode: filter by provider
 * - activeOnly: only return active overrides (default true)
 * - limit: max items to return (default 100)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const capCode = searchParams.get("capCode");
    const providerCode = searchParams.get("providerCode");
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build conditions
    const conditions = [];

    if (capCode) {
      conditions.push(eq(priceOverrides.capCode, capCode));
    }

    if (providerCode) {
      conditions.push(eq(priceOverrides.providerCode, providerCode));
    }

    if (activeOnly) {
      conditions.push(eq(priceOverrides.isActive, true));
      conditions.push(
        or(
          isNull(priceOverrides.validUntil),
          gt(priceOverrides.validUntil, new Date())
        )
      );
    }

    // Get overrides
    const result = await db
      .select({
        id: priceOverrides.id,
        capCode: priceOverrides.capCode,
        providerCode: priceOverrides.providerCode,
        contractType: priceOverrides.contractType,
        term: priceOverrides.term,
        annualMileage: priceOverrides.annualMileage,
        overrideType: priceOverrides.overrideType,
        overrideValue: priceOverrides.overrideValue,
        reason: priceOverrides.reason,
        internalNotes: priceOverrides.internalNotes,
        validFrom: priceOverrides.validFrom,
        validUntil: priceOverrides.validUntil,
        isActive: priceOverrides.isActive,
        priority: priceOverrides.priority,
        createdBy: priceOverrides.createdBy,
        updatedBy: priceOverrides.updatedBy,
        createdAt: priceOverrides.createdAt,
        updatedAt: priceOverrides.updatedAt,
      })
      .from(priceOverrides)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(priceOverrides.priority), desc(priceOverrides.createdAt))
      .limit(limit);

    // Get user names
    const userIds = [
      ...new Set(
        result
          .flatMap((o) => [o.createdBy, o.updatedBy])
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

    // Get vehicle info for CAP codes
    const capCodes = result.map((o) => o.capCode).filter((c): c is string => c !== null);
    let vehicleMap = new Map<string, { manufacturer: string; model: string; variant: string | null }>();

    if (capCodes.length > 0) {
      const vehicleResult = await db
        .select({
          capCode: vehicles.capCode,
          manufacturer: vehicles.manufacturer,
          model: vehicles.model,
          variant: vehicles.variant,
        })
        .from(vehicles)
        .where(inArray(vehicles.capCode, capCodes));

      vehicleMap = new Map(
        vehicleResult.map((v) => [
          v.capCode!,
          { manufacturer: v.manufacturer, model: v.model, variant: v.variant },
        ])
      );
    }

    // Transform to response format
    const overrides: PriceOverride[] = result.map((o) => ({
      id: o.id,
      capCode: o.capCode,
      providerCode: o.providerCode,
      contractType: o.contractType,
      term: o.term,
      annualMileage: o.annualMileage,
      overrideType: o.overrideType as PriceOverrideType,
      overrideValuePence: o.overrideValue,
      overrideValueGbp:
        o.overrideType === "percentage"
          ? o.overrideValue // percentage is stored as integer (e.g., 10 = 10%)
          : Math.round(o.overrideValue / 100), // convert pence to GBP
      reason: o.reason,
      internalNotes: o.internalNotes,
      validFrom: o.validFrom.toISOString(),
      validUntil: o.validUntil?.toISOString() || null,
      isActive: o.isActive ?? true,
      priority: o.priority ?? 0,
      createdByName: o.createdBy ? userMap.get(o.createdBy) || null : null,
      updatedByName: o.updatedBy ? userMap.get(o.updatedBy) || null : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      vehicleInfo: o.capCode ? vehicleMap.get(o.capCode) || null : null,
    }));

    const response: PriceOverridesResponse = {
      overrides,
      total: overrides.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching price overrides:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch overrides" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/price-overrides
 *
 * Create or update a price override.
 *
 * Body:
 * - id: string (optional, for update)
 * - capCode: string (optional)
 * - providerCode: string (optional)
 * - contractType: string (optional)
 * - term: number (optional)
 * - annualMileage: number (optional)
 * - overrideType: "fixed" | "percentage" | "absolute"
 * - overrideValueGbp: number (for fixed/absolute) or percentage integer
 * - reason: string (optional)
 * - internalNotes: string (optional)
 * - validFrom: string (optional, defaults to now)
 * - validUntil: string (optional)
 * - isActive: boolean (optional, defaults to true)
 * - priority: number (optional, defaults to 0)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      capCode,
      providerCode,
      contractType,
      term,
      annualMileage,
      overrideType,
      overrideValueGbp,
      reason,
      internalNotes,
      validFrom,
      validUntil,
      isActive,
      priority,
    } = body;

    // Validate override type
    if (!["fixed", "percentage", "absolute"].includes(overrideType)) {
      return NextResponse.json({ error: "Invalid override type" }, { status: 400 });
    }

    // Convert GBP to pence for storage (except percentage)
    const overrideValuePence =
      overrideType === "percentage"
        ? Math.round(overrideValueGbp) // Store as integer percentage
        : Math.round(overrideValueGbp * 100); // Convert GBP to pence

    if (id) {
      // Update existing
      const [updated] = await db
        .update(priceOverrides)
        .set({
          capCode: capCode || null,
          providerCode: providerCode || null,
          contractType: contractType || null,
          term: term || null,
          annualMileage: annualMileage || null,
          overrideType,
          overrideValue: overrideValuePence,
          reason: reason || null,
          internalNotes: internalNotes || null,
          validFrom: validFrom ? new Date(validFrom) : undefined,
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: isActive ?? true,
          priority: priority ?? 0,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(priceOverrides.id, id))
        .returning();

      return NextResponse.json({ success: true, override: updated });
    } else {
      // Create new
      const [created] = await db
        .insert(priceOverrides)
        .values({
          capCode: capCode || null,
          providerCode: providerCode || null,
          contractType: contractType || null,
          term: term || null,
          annualMileage: annualMileage || null,
          overrideType,
          overrideValue: overrideValuePence,
          reason: reason || null,
          internalNotes: internalNotes || null,
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: isActive ?? true,
          priority: priority ?? 0,
          createdBy: session.user.id,
        })
        .returning();

      return NextResponse.json({ success: true, override: created });
    }
  } catch (error) {
    console.error("Error saving price override:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save override" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/price-overrides
 *
 * Delete a price override.
 *
 * Query params:
 * - id: string (required)
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await db.delete(priceOverrides).where(eq(priceOverrides.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting price override:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete override" },
      { status: 500 }
    );
  }
}
