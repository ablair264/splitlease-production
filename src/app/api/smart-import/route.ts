/**
 * Smart Import API
 *
 * Unified import endpoint that auto-detects file format and uses
 * the appropriate parser (tabular or matrix).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeFile, smartImport } from "@/lib/imports/smart-import";
import type { ContractType } from "@/lib/imports/smart-import";

/**
 * POST /api/smart-import
 *
 * Analyze or import a ratebook file.
 *
 * Body params:
 * - fileName: string - Original file name
 * - fileContent: string - Base64-encoded file content
 * - providerCode: string - Provider code (e.g., "lex", "ogilvie", "drivalia")
 * - contractType?: ContractType - Override contract type if known
 * - action: "analyze" | "import" - What to do with the file
 * - dryRun?: boolean - Parse only, don't save to DB (for import action)
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
      action = "analyze",
      dryRun = false,
    } = body as {
      fileName: string;
      fileContent: string;
      providerCode: string;
      contractType?: ContractType;
      action?: "analyze" | "import";
      dryRun?: boolean;
    };

    if (!fileName || !fileContent) {
      return NextResponse.json(
        { error: "fileName and fileContent are required" },
        { status: 400 }
      );
    }

    if (action === "import" && !providerCode) {
      return NextResponse.json(
        { error: "providerCode is required for import" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, "base64");

    if (action === "analyze") {
      // Just analyze and return preview
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
        })),
        preview: result.preview.slice(0, 20),
        totalPreviewRates: result.preview.length,
      });
    }

    // Perform import
    const result = await smartImport({
      fileName,
      fileContent: buffer,
      providerCode,
      contractType,
      userId: session.user.id,
      dryRun,
    });

    return NextResponse.json({
      success: result.success,
      action: "import",
      dryRun,
      fileName,
      format: result.format,
      totalSheets: result.totalSheets,
      processedSheets: result.processedSheets,
      totalRates: result.totalRates,
      successRates: result.successRates,
      errorRates: result.errorRates,
      errors: result.errors.slice(0, 20),
      warnings: result.warnings.slice(0, 20),
      // Include sample rates for verification
      sampleRates: result.rates.slice(0, 10).map((rate) => ({
        manufacturer: rate.manufacturer,
        model: rate.model,
        variant: rate.variant,
        term: rate.term,
        mileage: rate.annualMileage,
        profile: rate.paymentProfile,
        monthly: rate.monthlyRental / 100, // Convert pence to pounds for display
        maintained: rate.isMaintained,
        contract: rate.contractType,
        source: `${rate.sourceSheet}:${rate.sourceRow + 1}`,
      })),
    });
  } catch (error) {
    console.error("Smart import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
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
    tabularHeaders: {
      description: "Tabular files should have column headers matching these patterns",
      patterns: {
        capCode: ["cap_code", "capcode", "cap code"],
        manufacturer: ["manufacturer", "make", "brand"],
        model: ["model", "model_name", "range"],
        variant: ["variant", "derivative", "vehicle description"],
        term: ["term", "contract_term", "months"],
        mileage: ["annual_mileage", "mileage", "miles"],
        rental: ["rental", "monthly", "net_rental", "rate"],
      },
    },
    matrixFormat: {
      description: "Matrix files have payment profiles (e.g., 1+23, 3+35) in rows and mileage bands (e.g., 5000, 10000) in columns",
      paymentProfiles: ["1+23", "1+35", "1+47", "3+33", "3+45", "6+42"],
      mileageBands: [5000, 8000, 10000, 15000, 20000],
    },
  });
}
