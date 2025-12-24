import { NextRequest, NextResponse } from "next/server";
import { loginToOgilvie, cacheOgilvieSession } from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await loginToOgilvie(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Login failed" },
        { status: 401 }
      );
    }

    // Cache the session for this user
    if (result.sessionCookie) {
      await cacheOgilvieSession(
        session.user.id,
        result.sessionCookie,
        result.verificationToken
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Ogilvie login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
