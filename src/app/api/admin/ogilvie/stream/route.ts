import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";

const RAILWAY_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://splitfin-broker-production.up.railway.app";

/**
 * Create a JWT token for Railway API authentication
 */
function createApiToken(userId: string, email?: string | null, name?: string | null): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET not configured");
  }

  return jwt.sign(
    {
      sub: userId,
      id: userId,
      email: email || undefined,
      name: name || undefined,
    },
    secret,
    { expiresIn: "1h" }
  );
}

// =============================================================================
// GET /api/admin/ogilvie/stream - SSE streaming proxy for export progress
// =============================================================================

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const configs = searchParams.get("configs");

  if (!configs) {
    return new Response("configs parameter is required", { status: 400 });
  }

  try {
    const token = createApiToken(session.user.id, session.user.email, session.user.name);

    // Fetch from Railway with auth header
    const railwayUrl = `${RAILWAY_API_URL}/api/ogilvie/export/stream?configs=${encodeURIComponent(configs)}`;

    const response = await fetch(railwayUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "text/event-stream",
      },
    });

    if (!response.ok) {
      return new Response(`Railway API error: ${response.status}`, { status: response.status });
    }

    // Stream the response back to the client
    const stream = response.body;
    if (!stream) {
      return new Response("No stream available", { status: 500 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Ogilvie stream error:", error);
    return new Response(
      error instanceof Error ? error.message : "Stream request failed",
      { status: 500 }
    );
  }
}
