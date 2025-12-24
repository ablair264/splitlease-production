import { NextResponse } from "next/server";
import { getCachedOgilvieSession, validateOgilvieSession, getOgilvieManufacturers } from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cached Ogilvie session
    const cachedSession = await getCachedOgilvieSession(session.user.id);

    if (!cachedSession) {
      return NextResponse.json(
        { error: "No Ogilvie session. Please login first." },
        { status: 401 }
      );
    }

    // Validate session is still active
    const isValid = await validateOgilvieSession(cachedSession.sessionCookie);
    if (!isValid) {
      return NextResponse.json(
        { error: "Ogilvie session expired. Please login again." },
        { status: 401 }
      );
    }

    // Fetch manufacturers
    const manufacturers = await getOgilvieManufacturers(cachedSession.sessionCookie);

    return NextResponse.json({
      success: true,
      manufacturers,
    });
  } catch (error) {
    console.error("Ogilvie manufacturers API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
