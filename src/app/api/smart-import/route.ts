/**
 * Smart Import API
 *
 * Proxies import requests to Railway backend which handles the heavy processing.
 * Railway doesn't have the same timeout limits as Netlify serverless functions.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/utils";

const RAILWAY_API = getApiBaseUrl();

/**
 * POST /api/smart-import
 *
 * Proxies to Railway backend for ratebook import processing.
 *
 * Body params:
 * - fileName: string - Original file name
 * - fileContent: string - Base64-encoded file content
 * - providerCode: string - Provider code (e.g., "lex", "ogilvie", "ald")
 * - contractType: ContractType - Contract type
 * - columnMappings?: Record<string, string> - Custom column mappings
 * - action: "analyze" | "import" - What to do with the file
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      fileName,
      fileContent,
      providerCode,
      contractType,
      action = "import",
      columnMappings,
    } = body;

    if (!fileName || !fileContent) {
      return NextResponse.json(
        { error: "fileName and fileContent are required" },
        { status: 400 }
      );
    }

    if (!providerCode) {
      return NextResponse.json(
        { error: "providerCode is required" },
        { status: 400 }
      );
    }

    // For analyze action, we could do quick local detection
    // but for actual import, proxy to Railway
    if (action === "analyze") {
      // Quick local analysis for preview - this is fast enough for Netlify
      const { analyzeFile } = await import("@/lib/imports/smart-import");
      const buffer = Buffer.from(fileContent, "base64");
      const result = await analyzeFile(buffer, fileName);

      return NextResponse.json({
        success: true,
        action: "analyze",
        fileName,
        format: result.format,
        confidence: result.confidence,
        reason: result.reason,
        sheets: result.sheets.map((sheet) => ({
          name: sheet.name,
          format: sheet.format,
          headerRow: sheet.headerRow,
          vehicleInfo: sheet.vehicleInfo,
          matrixInfo: sheet.matrixInfo
            ? {
                rowType: sheet.matrixInfo.rowType,
                colType: sheet.matrixInfo.colType,
                hasSubColumns: sheet.matrixInfo.hasSubColumns,
              }
            : undefined,
          columnCount: sheet.columns?.length || 0,
          columns: sheet.columns?.map((col) => ({
            sourceColumn: col.sourceColumn,
            sourceHeader: col.sourceHeader,
            targetField: col.targetField,
            confidence: col.confidence,
          })),
        })),
        preview: result.preview.slice(0, 20),
        totalPreviewRates: result.preview.length,
      });
    }

    // Proxy import to Railway backend
    const railwayEndpoint = columnMappings
      ? `${RAILWAY_API}/api/admin/ratebooks/import-with-mappings`
      : `${RAILWAY_API}/api/admin/ratebooks/import`;

    console.log(`[smart-import] Proxying to Railway: ${railwayEndpoint}`);

    const railwayResponse = await fetch(railwayEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        fileContent,
        providerCode,
        contractType: contractType || "BCH",
        columnMappings,
      }),
    });

    const railwayData = await railwayResponse.json();

    if (!railwayResponse.ok) {
      return NextResponse.json(
        {
          error: railwayData.error || "Import failed on Railway backend",
          success: false,
        },
        { status: railwayResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      action: "import",
      ...railwayData,
    });
  } catch (error) {
    console.error("Smart import error:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : String(error);

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/smart-import
 *
 * Get supported formats and provider codes
 */
export async function GET() {
  return NextResponse.json({
    formats: ["tabular", "matrix"],
    providers: [
      { code: "lex", name: "Lex Autolease" },
      { code: "ogilvie", name: "Ogilvie Fleet" },
      { code: "venus", name: "Venus Fleet" },
      { code: "ald", name: "ALD Automotive" },
      { code: "drivalia", name: "Drivalia" },
      { code: "arval", name: "Arval" },
      { code: "zenith", name: "Zenith" },
      { code: "alphabet", name: "Alphabet" },
      { code: "dealer", name: "Dealer Quote" },
      { code: "other", name: "Other" },
    ],
    contractTypes: ["BCH", "PCH", "CH", "CHNM", "PCHNM", "BSSNL"],
    backend: "railway",
  });
}
