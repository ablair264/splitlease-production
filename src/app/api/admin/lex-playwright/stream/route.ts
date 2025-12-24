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
// GET /api/admin/lex-playwright/stream - SSE stream for batch progress
// =============================================================================

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  if (!batchId) {
    return new Response("batchId is required", { status: 400 });
  }

  const token = createApiToken(session.user.id, session.user.email, session.user.name);

  // Create a TransformStream to pipe the SSE data
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(
          `${RAILWAY_API_URL}/api/lex-playwright/batch/${batchId}/stream`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "text/event-stream",
            },
          }
        );

        if (!response.ok) {
          controller.enqueue(encoder.encode(`event: error\ndata: {"error": "Failed to connect to stream"}\n\n`));
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`event: error\ndata: {"error": "No response body"}\n\n`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (error) {
        console.error("SSE stream error:", error);
        controller.enqueue(
          encoder.encode(`event: error\ndata: {"error": "${error instanceof Error ? error.message : "Stream error"}"}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
