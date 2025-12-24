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
// GET /api/admin/ogilvie/download/[batchId] - Download CSV export
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { batchId } = await params;

  if (!batchId) {
    return new Response("batchId is required", { status: 400 });
  }

  try {
    const token = createApiToken(session.user.id, session.user.email, session.user.name);

    // Fetch from Railway with auth header
    const railwayUrl = `${RAILWAY_API_URL}/api/ogilvie/exports/${batchId}?download=true`;

    const response = await fetch(railwayUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return new Response(`Railway API error: ${response.status}`, { status: response.status });
    }

    // Stream the file back to the client
    const stream = response.body;
    if (!stream) {
      return new Response("No data available", { status: 500 });
    }

    // Get the content-disposition header from the Railway response
    const contentDisposition = response.headers.get("content-disposition") || `attachment; filename="ogilvie-export-${batchId}.csv"`;
    const contentType = response.headers.get("content-type") || "text/csv";

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.error("Ogilvie download error:", error);
    return new Response(
      error instanceof Error ? error.message : "Download request failed",
      { status: 500 }
    );
  }
}
