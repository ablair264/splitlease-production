import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratebookImports, financeProviders, providerRates } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { importLexRatebook } from "@/lib/imports/lex-ratebook-importer";
import { importOgilvieRatebook } from "@/lib/imports/ogilvie-ratebook-importer";
import { importALDRatebook } from "@/lib/imports/ald-ratebook-importer";

/**
 * GET /api/admin/ratebooks
 * List all ratebook imports with optional filtering
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const providerCode = searchParams.get("provider");
    const contractType = searchParams.get("contractType");
    const latestOnly = searchParams.get("latest") === "true";

    // Build query conditions
    const conditions = [];
    if (providerCode) {
      conditions.push(eq(ratebookImports.providerCode, providerCode));
    }
    if (contractType) {
      conditions.push(eq(ratebookImports.contractType, contractType));
    }
    if (latestOnly) {
      conditions.push(eq(ratebookImports.isLatest, true));
    }

    // Get imports
    const imports = await db
      .select({
        id: ratebookImports.id,
        providerCode: ratebookImports.providerCode,
        contractType: ratebookImports.contractType,
        batchId: ratebookImports.batchId,
        fileName: ratebookImports.fileName,
        status: ratebookImports.status,
        totalRows: ratebookImports.totalRows,
        successRows: ratebookImports.successRows,
        errorRows: ratebookImports.errorRows,
        uniqueCapCodes: ratebookImports.uniqueCapCodes,
        isLatest: ratebookImports.isLatest,
        completedAt: ratebookImports.completedAt,
        createdAt: ratebookImports.createdAt,
      })
      .from(ratebookImports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ratebookImports.createdAt))
      .limit(50);

    // Get providers
    const providers = await db.select().from(financeProviders);

    // Get summary stats
    const [stats] = await db
      .select({
        totalRates: sql<number>`count(*)`,
        uniqueVehicles: sql<number>`count(distinct ${providerRates.capCode})`,
      })
      .from(providerRates);

    return NextResponse.json({
      imports,
      providers,
      stats: {
        totalRates: Number(stats?.totalRates || 0),
        uniqueVehicles: Number(stats?.uniqueVehicles || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching ratebook imports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch imports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ratebooks
 * Import a new ratebook from CSV file content
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { providerCode, contractType, fileName, csvContent, term, annualMileage } = body as {
      providerCode: string;
      contractType: string;
      fileName: string;
      csvContent: string;
      term?: number; // Required for ALD
      annualMileage?: number; // Required for ALD
    };

    // Validate required fields
    if (!providerCode || !contractType || !csvContent) {
      return NextResponse.json(
        { error: "Provider code, contract type, and CSV content are required" },
        { status: 400 }
      );
    }

    // Validate provider
    const [provider] = await db
      .select()
      .from(financeProviders)
      .where(eq(financeProviders.code, providerCode))
      .limit(1);

    if (!provider) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerCode}` },
        { status: 400 }
      );
    }

    // Validate contract type
    const validContractTypes = ["CH", "CHNM", "PCH", "PCHNM", "BSSNL"];
    if (!validContractTypes.includes(contractType)) {
      return NextResponse.json(
        { error: `Invalid contract type: ${contractType}. Valid types: ${validContractTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if provider supports this contract type
    if (provider.supportedContractTypes && !provider.supportedContractTypes.includes(contractType)) {
      return NextResponse.json(
        { error: `Provider ${providerCode} does not support contract type ${contractType}` },
        { status: 400 }
      );
    }

    // Import based on provider
    let result;
    if (providerCode === "lex") {
      result = await importLexRatebook({
        fileName: fileName || `${contractType}_upload.csv`,
        contractType,
        csvContent,
        userId: session.user.id,
      });
    } else if (providerCode === "ogilvie") {
      result = await importOgilvieRatebook({
        fileName: fileName || `${contractType}_upload.csv`,
        contractType,
        csvContent,
        userId: session.user.id,
      });
    } else if (providerCode === "ald") {
      // ALD files contain term/mileage per row - no need to specify
      result = await importALDRatebook({
        fileName: fileName || `ald_${contractType}.csv`,
        contractType,
        fileContent: csvContent, // Can be CSV string or base64-encoded XLSX
        userId: session.user.id,
      });
    } else {
      // TODO: Add Drivalia importer
      return NextResponse.json(
        { error: `Import not yet supported for provider: ${providerCode}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      importId: result.importId,
      batchId: result.batchId,
      stats: {
        totalRows: result.totalRows,
        successRows: result.successRows,
        errorRows: result.errorRows,
        uniqueCapCodes: result.uniqueCapCodes,
      },
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error importing ratebook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import ratebook" },
      { status: 500 }
    );
  }
}
