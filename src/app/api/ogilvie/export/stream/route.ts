import { NextRequest } from "next/server";
import {
  getCachedOgilvieSession,
  runOgilvieExport,
  validateOgilvieSession,
} from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";
import type { OgilvieExportConfig } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
          sendEvent({ type: "error", error: "Unauthorized" });
          controller.close();
          return;
        }

        // Get cached Ogilvie session
        const cachedSession = await getCachedOgilvieSession(session.user.id);

        if (!cachedSession) {
          sendEvent({ type: "error", error: "No Ogilvie session. Please login first." });
          controller.close();
          return;
        }

        // Validate session is still active
        const isValid = await validateOgilvieSession(cachedSession.sessionCookie);
        if (!isValid) {
          sendEvent({ type: "error", error: "Ogilvie session expired. Please login again." });
          controller.close();
          return;
        }

        // Get configs from query string
        const configsParam = request.nextUrl.searchParams.get("configs");
        if (!configsParam) {
          sendEvent({ type: "error", error: "No configs provided" });
          controller.close();
          return;
        }

        let configs: OgilvieExportConfig[];
        try {
          configs = JSON.parse(configsParam);
        } catch {
          sendEvent({ type: "error", error: "Invalid configs format" });
          controller.close();
          return;
        }

        const results: Array<{ config: OgilvieExportConfig; success: boolean; batchId?: string; error?: string }> = [];

        // Run exports sequentially with progress updates
        for (let i = 0; i < configs.length; i++) {
          const config = configs[i];

          // Send progress update for starting this config
          sendEvent({
            type: "progress",
            progress: {
              status: "preparing",
              currentPage: 0,
              totalPages: 0,
              vehiclesProcessed: 0,
              configIndex: i,
              totalConfigs: configs.length,
              currentConfig: { contractTerm: config.contractTerm, contractMileage: config.contractMileage },
            },
          });

          const result = await runOgilvieExport(
            cachedSession.sessionCookie,
            config,
            (progress) => {
              sendEvent({
                type: "progress",
                progress: {
                  ...progress,
                  configIndex: i,
                  totalConfigs: configs.length,
                  currentConfig: { contractTerm: config.contractTerm, contractMileage: config.contractMileage },
                },
              });
            }
          );

          const configResult = {
            config: { contractTerm: config.contractTerm, contractMileage: config.contractMileage },
            success: result.success,
            batchId: result.batchId,
            error: result.error,
          };

          results.push(configResult);

          // Send config complete event
          sendEvent({
            type: "configComplete",
            result: configResult,
          });

          // Small delay between configs
          if (i < configs.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // Send complete event
        sendEvent({
          type: "complete",
          results,
        });

        controller.close();
      } catch (error) {
        console.error("Export stream error:", error);
        sendEvent({
          type: "error",
          error: error instanceof Error ? error.message : "Export failed",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
