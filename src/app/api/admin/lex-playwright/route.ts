import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Use VPS for Lex Playwright (Railway IPs are blocked by Lex)
const RAILWAY_API_URL = process.env.LEX_PLAYWRIGHT_API_URL || "http://87.106.76.43:3000";

/**
 * Create a JWT token for Railway API authentication
 */
function createApiToken(userId: string, email?: string | null, name?: string | null): string {
  // Hardcoded to match VPS - env var may not be loading on Netlify
  const secret = "k8Lm3nP9qR2sT5uV7wX0yZ1aB4cD6eF8";

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
// GET /api/admin/lex-playwright - Get vehicles, options, batches, or batch results
// =============================================================================

export async function GET(request: NextRequest) {
  // Note: Auth is handled by admin layout - API routes are internal
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "vehicles";

  try {
    let path = "/api/lex-playwright/vehicles";

    if (action === "vehicles") {
      const limit = searchParams.get("limit") || "500";
      const manufacturer = searchParams.get("manufacturer") || "";
      const search = searchParams.get("search") || "";
      path = `/api/lex-playwright/vehicles?limit=${limit}`;
      if (manufacturer) path += `&manufacturer=${encodeURIComponent(manufacturer)}`;
      if (search) path += `&search=${encodeURIComponent(search)}`;
    } else if (action === "options") {
      path = "/api/lex-playwright/options";
    } else if (action === "batches") {
      const limit = searchParams.get("limit") || "20";
      path = `/api/lex-playwright/batches?limit=${limit}`;
    } else if (action === "batch") {
      const batchId = searchParams.get("batchId");
      if (!batchId) {
        return NextResponse.json({ error: "batchId is required" }, { status: 400 });
      }
      path = `/api/lex-playwright/batch/${batchId}`;
    }

    const response = await proxyToRailway(
      path,
      "GET",
      "00000000-0000-0000-0000-000000000000",
      "blair@hotmail.co.uk",
      "Admin"
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Lex Playwright API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/lex-playwright - Start batch or test login
// =============================================================================

export async function POST(request: NextRequest) {
  // Note: Auth is handled by admin layout - API routes are internal
  try {
    const body = await request.json();
    const { action, ...data } = body;

    let path = "/api/lex-playwright/batch";

    if (action === "test-login") {
      path = "/api/lex-playwright/test-login";
    }

    const response = await proxyToRailway(
      path,
      "POST",
      "00000000-0000-0000-0000-000000000000",
      "blair@hotmail.co.uk",
      "Admin",
      data
    );

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error("Lex Playwright API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API request failed" },
      { status: 500 }
    );
  }
}
