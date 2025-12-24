import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicleCapMatches, providerRates } from "@/lib/db/schema";
import { eq, and, sql, desc, asc, ilike, or, isNull, isNotNull } from "drizzle-orm";
import {
  findCapCodeMatch,
  saveMatchResult,
  getMatchStats,
  generateSourceKey,
} from "@/lib/matching/vehicle-matcher";

/**
 * GET /api/admin/matching
 * List vehicle matches with filtering
 *
 * Query params:
 * - status: Filter by match status (pending, confirmed, rejected, manual)
 * - provider: Filter by source provider (ogilvie, drivalia)
 * - search: Search manufacturer/model
 * - hasMatch: true/false - filter by whether CAP code exists
 * - minConfidence: Minimum confidence score
 * - maxConfidence: Maximum confidence score
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const provider = searchParams.get("provider");
    const search = searchParams.get("search");
    const hasMatch = searchParams.get("hasMatch");
    const minConfidence = searchParams.get("minConfidence");
    const maxConfidence = searchParams.get("maxConfidence");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(vehicleCapMatches.matchStatus, status));
    }
    if (provider) {
      conditions.push(eq(vehicleCapMatches.sourceProvider, provider));
    }
    if (search) {
      conditions.push(
        or(
          ilike(vehicleCapMatches.manufacturer, `%${search}%`),
          ilike(vehicleCapMatches.model, `%${search}%`),
          ilike(vehicleCapMatches.variant, `%${search}%`)
        )
      );
    }
    if (hasMatch === "true") {
      conditions.push(isNotNull(vehicleCapMatches.capCode));
    } else if (hasMatch === "false") {
      conditions.push(isNull(vehicleCapMatches.capCode));
    }
    if (minConfidence) {
      conditions.push(sql`${vehicleCapMatches.matchConfidence} >= ${parseFloat(minConfidence)}`);
    }
    if (maxConfidence) {
      conditions.push(sql`${vehicleCapMatches.matchConfidence} <= ${parseFloat(maxConfidence)}`);
    }

    // Query matches
    const matches = await db
      .select()
      .from(vehicleCapMatches)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vehicleCapMatches.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vehicleCapMatches)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get stats by provider
    const stats = await db
      .select({
        sourceProvider: vehicleCapMatches.sourceProvider,
        status: vehicleCapMatches.matchStatus,
        count: sql<number>`count(*)`,
      })
      .from(vehicleCapMatches)
      .groupBy(vehicleCapMatches.sourceProvider, vehicleCapMatches.matchStatus);

    // Organize stats by provider
    const statsByProvider: Record<string, Record<string, number>> = {};
    for (const row of stats) {
      if (!statsByProvider[row.sourceProvider]) {
        statsByProvider[row.sourceProvider] = {};
      }
      statsByProvider[row.sourceProvider][row.status] = Number(row.count);
    }

    return NextResponse.json({
      matches: matches.map((m) => ({
        id: m.id,
        sourceKey: m.sourceKey,
        sourceProvider: m.sourceProvider,
        manufacturer: m.manufacturer,
        model: m.model,
        variant: m.variant,
        p11dGbp: m.p11d ? m.p11d / 100 : null,
        capCode: m.capCode,
        matchedManufacturer: m.matchedManufacturer,
        matchedModel: m.matchedModel,
        matchedVariant: m.matchedVariant,
        matchedP11dGbp: m.matchedP11d ? m.matchedP11d / 100 : null,
        confidence: m.matchConfidence ? parseFloat(m.matchConfidence) : null,
        status: m.matchStatus,
        method: m.matchMethod,
        matchedAt: m.matchedAt,
        confirmedAt: m.confirmedAt,
        createdAt: m.createdAt,
      })),
      pagination: {
        total: Number(countResult?.count || 0),
        limit,
        offset,
        hasMore: offset + matches.length < Number(countResult?.count || 0),
      },
      stats: statsByProvider,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/matching
 * Confirm or reject a match, or trigger re-matching
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, matchId, capCode } = body as {
      action: "confirm" | "reject" | "rematch" | "manual";
      matchId: string;
      capCode?: string; // For manual action
    };

    if (!action || !matchId) {
      return NextResponse.json(
        { error: "action and matchId are required" },
        { status: 400 }
      );
    }

    // Get existing match
    const [existingMatch] = await db
      .select()
      .from(vehicleCapMatches)
      .where(eq(vehicleCapMatches.id, matchId))
      .limit(1);

    if (!existingMatch) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    switch (action) {
      case "confirm":
        if (!existingMatch.capCode) {
          return NextResponse.json(
            { error: "Cannot confirm a match without a CAP code" },
            { status: 400 }
          );
        }
        await db
          .update(vehicleCapMatches)
          .set({
            matchStatus: "confirmed",
            confirmedBy: session.user.id,
            confirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(vehicleCapMatches.id, matchId));
        break;

      case "reject":
        await db
          .update(vehicleCapMatches)
          .set({
            matchStatus: "rejected",
            capCode: null,
            matchedManufacturer: null,
            matchedModel: null,
            matchedVariant: null,
            matchedP11d: null,
            confirmedBy: session.user.id,
            confirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(vehicleCapMatches.id, matchId));
        break;

      case "manual":
        if (!capCode) {
          return NextResponse.json(
            { error: "capCode is required for manual action" },
            { status: 400 }
          );
        }

        // Look up the CAP code details from Lex data
        const [lexVehicle] = await db
          .selectDistinctOn([providerRates.capCode], {
            manufacturer: providerRates.manufacturer,
            model: providerRates.model,
            variant: providerRates.variant,
            p11d: providerRates.p11d,
          })
          .from(providerRates)
          .where(
            and(
              eq(providerRates.capCode, capCode),
              eq(providerRates.providerCode, "lex")
            )
          )
          .limit(1);

        await db
          .update(vehicleCapMatches)
          .set({
            capCode,
            matchedManufacturer: lexVehicle?.manufacturer || null,
            matchedModel: lexVehicle?.model || null,
            matchedVariant: lexVehicle?.variant || null,
            matchedP11d: lexVehicle?.p11d || null,
            matchConfidence: "100",
            matchStatus: "manual",
            matchMethod: "manual",
            matchedAt: new Date(),
            confirmedBy: session.user.id,
            confirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(vehicleCapMatches.id, matchId));
        break;

      case "rematch":
        // Re-run the matching algorithm
        const result = await findCapCodeMatch({
          manufacturer: existingMatch.manufacturer,
          model: existingMatch.model,
          variant: existingMatch.variant,
          p11d: existingMatch.p11d,
        });
        await saveMatchResult(result, existingMatch.sourceProvider);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Fetch updated match
    const [updatedMatch] = await db
      .select()
      .from(vehicleCapMatches)
      .where(eq(vehicleCapMatches.id, matchId))
      .limit(1);

    return NextResponse.json({
      success: true,
      match: {
        id: updatedMatch.id,
        sourceKey: updatedMatch.sourceKey,
        manufacturer: updatedMatch.manufacturer,
        model: updatedMatch.model,
        variant: updatedMatch.variant,
        capCode: updatedMatch.capCode,
        confidence: updatedMatch.matchConfidence ? parseFloat(updatedMatch.matchConfidence) : null,
        status: updatedMatch.matchStatus,
      },
    });
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update match" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/matching
 * Search for CAP code candidates for a vehicle
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { manufacturer, model, variant } = body as {
      manufacturer: string;
      model?: string;
      variant?: string;
    };

    if (!manufacturer) {
      return NextResponse.json(
        { error: "manufacturer is required" },
        { status: 400 }
      );
    }

    // Build search conditions
    const conditions = [
      eq(providerRates.providerCode, "lex"),
      sql`${providerRates.importId} IN (SELECT id FROM ratebook_imports WHERE is_latest = true)`,
      ilike(providerRates.manufacturer, `%${manufacturer}%`),
    ];

    if (model) {
      conditions.push(ilike(providerRates.model, `%${model}%`));
    }
    if (variant) {
      conditions.push(ilike(providerRates.variant, `%${variant}%`));
    }

    // Get candidate vehicles
    const candidates = await db
      .selectDistinctOn([providerRates.capCode], {
        capCode: providerRates.capCode,
        manufacturer: providerRates.manufacturer,
        model: providerRates.model,
        variant: providerRates.variant,
        p11d: providerRates.p11d,
        fuelType: providerRates.fuelType,
        transmission: providerRates.transmission,
      })
      .from(providerRates)
      .where(and(...conditions))
      .orderBy(providerRates.capCode, asc(providerRates.manufacturer))
      .limit(50);

    return NextResponse.json({
      candidates: candidates.map((c) => ({
        capCode: c.capCode,
        manufacturer: c.manufacturer,
        model: c.model,
        variant: c.variant,
        p11dGbp: c.p11d ? c.p11d / 100 : null,
        fuelType: c.fuelType,
        transmission: c.transmission,
      })),
    });
  } catch (error) {
    console.error("Error searching candidates:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search candidates" },
      { status: 500 }
    );
  }
}
