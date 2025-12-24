import { NextResponse } from "next/server";
import { getCachedOgilvieSession, validateOgilvieSession } from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cached session
    const cachedSession = await getCachedOgilvieSession(session.user.id);

    if (!cachedSession) {
      return NextResponse.json({
        valid: false,
        message: "No Ogilvie session found. Please login.",
      });
    }

    // Validate the session is still active
    const isValid = await validateOgilvieSession(cachedSession.sessionCookie);

    return NextResponse.json({
      valid: isValid,
      message: isValid
        ? "Session is active"
        : "Session expired. Please login again.",
      expiresAt: cachedSession.expiresAt,
    });
  } catch (error) {
    console.error("Ogilvie validate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
