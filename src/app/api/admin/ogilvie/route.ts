import { NextRequest, NextResponse } from "next/server";
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

/**
 * Proxy request to Railway API with authentication
 */
async function proxyToRailway(
  path: string,
  method: string,
  userId: string,
  email?: string | null,
  name?: string | null,
  body?: unknown
): Promise<Response> {
  const token = createApiToken(userId, email, name);

  const headers: HeadersInit = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  return fetch(`${RAILWAY_API_URL}${path}`, options);
}

// =============================================================================
// GET /api/admin/ogilvie - Get session status or exports list
// =============================================================================

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "validate";

  try {
    let path = "/api/ogilvie/validate";

    if (action === "exports") {
      const limit = searchParams.get("limit") || "20";
      path = `/api/ogilvie/exports?limit=${limit}`;
    } else if (action === "manufacturers") {
      path = "/api/ogilvie/manufacturers";
    }

    const response = await proxyToRailway(
      path,
      "GET",
      session.user.id,
      session.user.email,
      session.user.name
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Ogilvie API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/ogilvie - Login, export, or process
// =============================================================================

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    let path = "/api/ogilvie/login";

    if (action === "export") {
      path = "/api/ogilvie/export";
    } else if (action === "process") {
      path = "/api/ogilvie/process";
    }

    const response = await proxyToRailway(
      path,
      "POST",
      session.user.id,
      session.user.email,
      session.user.name,
      data
    );

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error("Ogilvie API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/admin/ogilvie - Delete an export
// =============================================================================

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  if (!batchId) {
    return NextResponse.json({ error: "batchId is required" }, { status: 400 });
  }

  try {
    const response = await proxyToRailway(
      `/api/ogilvie/exports/${batchId}`,
      "DELETE",
      session.user.id,
      session.user.email,
      session.user.name
    );

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error("Ogilvie API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 }
    );
  }
}
