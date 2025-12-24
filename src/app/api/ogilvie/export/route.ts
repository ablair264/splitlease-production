import { NextRequest, NextResponse } from "next/server";
import {
  getCachedOgilvieSession,
  runOgilvieExport,
  runOgilvieMultiExport,
  validateOgilvieSession,
} from "@/lib/scraper/ogilvie";
import { auth } from "@/lib/auth";
import type { OgilvieExportConfig } from "@/lib/db/schema";

// Default export configurations
const DEFAULT_CONFIGS: OgilvieExportConfig[] = [
  { contractTerm: 24, contractMileage: 20000 },
  { contractTerm: 36, contractMileage: 30000 },
  { contractTerm: 48, contractMileage: 40000 },
];

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { configs, single } = body as {
      configs?: OgilvieExportConfig[];
      single?: OgilvieExportConfig;
    };

    // Single export
    if (single) {
      const result = await runOgilvieExport(cachedSession.sessionCookie, single);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Export failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        batchId: result.batchId,
        message: `Export completed successfully`,
      });
    }

    // Multi export (default configs or provided configs)
    const exportConfigs = configs || DEFAULT_CONFIGS;

    const { results } = await runOgilvieMultiExport(
      cachedSession.sessionCookie,
      exportConfigs
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Ogilvie export API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
