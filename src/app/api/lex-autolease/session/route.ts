import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lexSessions } from "@/lib/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import type { LexProfile } from "@/lib/db/schema";

// CORS headers for bookmarklet cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * OPTIONS /api/lex-autolease/session
 * Handle CORS preflight for bookmarklet
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/lex-autolease/session
 * Check if there's a valid session stored
 */
export async function GET() {
  try {
    const sessions = await db
      .select({
        id: lexSessions.id,
        isValid: lexSessions.isValid,
        expiresAt: lexSessions.expiresAt,
        lastUsedAt: lexSessions.lastUsedAt,
        createdAt: lexSessions.createdAt,
        profileData: lexSessions.profileData,
      })
      .from(lexSessions)
      .where(
        and(
          eq(lexSessions.isValid, true),
          gt(lexSessions.expiresAt, new Date())
        )
      )
      .orderBy(desc(lexSessions.createdAt))
      .limit(1);

    if (sessions.length === 0) {
      return NextResponse.json({
        hasValidSession: false,
        message: "No valid session found. Please capture a new session from the Lex portal.",
      });
    }

    const session = sessions[0];
    const profile = session.profileData as LexProfile;

    return NextResponse.json({
      hasValidSession: true,
      sessionId: session.id,
      username: profile.Username || "Unknown",
      role: profile.Role,
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json(
      { error: "Failed to check session status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lex-autolease/session
 * Save a new session captured from browser
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csrfToken, profile, cookies } = body;

    if (!csrfToken || !cookies) {
      return NextResponse.json(
        { error: "Missing required session data (csrfToken, cookies)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Profile is optional - use defaults if not provided
    const safeProfile = profile || {};

    // Invalidate any existing sessions
    await db
      .update(lexSessions)
      .set({ isValid: false })
      .where(eq(lexSessions.isValid, true));

    // Calculate expiry (sessions typically last 8 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    // Store new session
    const [newSession] = await db
      .insert(lexSessions)
      .values({
        sessionCookies: cookies,
        csrfToken,
        profileData: {
          SalesCode: safeProfile.SalesCode || "",
          Discount: safeProfile.Discount || "-1",
          RVCode: safeProfile.RVCode || "00",
          Role: safeProfile.Role || "",
          Username: safeProfile.Username || "",
        },
        isValid: true,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      username: safeProfile.Username || "Unknown",
      expiresAt,
      message: "Session saved successfully. You can now run quotes from the server.",
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error saving session:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/lex-autolease/session
 * Invalidate current session
 */
export async function DELETE() {
  try {
    await db
      .update(lexSessions)
      .set({ isValid: false })
      .where(eq(lexSessions.isValid, true));

    return NextResponse.json({
      success: true,
      message: "Session invalidated",
    });
  } catch (error) {
    console.error("Error invalidating session:", error);
    return NextResponse.json(
      { error: "Failed to invalidate session" },
      { status: 500 }
    );
  }
}
