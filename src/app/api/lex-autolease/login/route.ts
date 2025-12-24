import { NextRequest, NextResponse } from "next/server";
import { LexApiClient } from "@/lib/lex/api-client";

/**
 * POST /api/lex-autolease/login
 * Login with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const client = await LexApiClient.login(email, password);

    return NextResponse.json({
      success: true,
      message: "Login successful. Session saved.",
    });
  } catch (error) {
    console.error("Lex login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 }
    );
  }
}
