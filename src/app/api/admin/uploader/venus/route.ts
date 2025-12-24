import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ratebookImports, providerRates, financeProviders, vehicles } from "@/lib/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

// Term column patterns: "1+23" means 1 month initial + 23 months remaining = 24 month term
const TERM_PATTERN = /^(\d+)\+(\d+)$/;

// Mileage patterns
const MILEAGE_PATTERNS: Record<string, number> = {
  "5k": 5000,
  "8k": 8000,
  "10k": 10000,
  "15k": 15000,
  "20k": 20000,
  "25k": 25000,
  "30k": 30000,
};

// Payment plan mapping based on initial months
const PAYMENT_PLAN_MAP: Record<number, string> = {
  1: "monthly_in_advance",
  3: "spread_3_down",
  6: "spread_6_down",
  9: "spread_9_down",
  12: "spread_12_down",
};

// Manufacturer name normalization
const MANUFACTURER_MAP: Record<string, string> = {
  "Cherry": "Chery",
  "Omoda & Jaecoo": "Omoda",
  "Omoda___Jaecoo": "Omoda",
  "Ford_": "Ford",
  "Ford EVs": "Ford",
  "Ford_EVs_with_Ford_Power_": "Ford",
  "Cupra_": "Cupra",
  "Cupra_Base_rates": "Cupra",
  "Mazda_": "Mazda",
  "Genesis_": "Genesis",
};

// Sheets to skip
const SKIP_SHEETS = ["Bulletins", "Pre_Reg", "Pre Reg", "Summary", "Index", "Cover"];

interface ParsedRate {
  manufacturer: string;
  model: string;
  variant: string;
  term: number;
  annualMileage: number;
  paymentPlan: string;
  initialMonths: number;
  monthlyRentalPence: number;
  vehicleName: string;
}

interface ImportStats {
  totalRates: number;
  insertedRates: number;
  skippedRates: number;
  errors: string[];
  matchedVehicles: Set<string>;
  unmatchedVehicles: Set<string>;
  sheetsProcessed: string[];
}

/**
 * Parse a price value to pence
 */
function parsePriceToPence(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  let numValue: number;

  if (typeof value === "number") {
    numValue = value;
  } else if (typeof value === "string") {
    const cleaned = value.replace(/[£,\s]/g, "").trim();
    if (!cleaned || cleaned === "") return null;
    numValue = parseFloat(cleaned);
  } else {
    return null;
  }

  if (isNaN(numValue) || numValue <= 0) return null;
  return Math.round(numValue * 100);
}

/**
 * Parse mileage from row label like "5k -Non Maintained" or "10k Non-Maintained"
 */
function parseMileage(label: unknown): number | null {
  if (!label || typeof label !== "string") return null;
  const lower = label.toLowerCase().trim();

  for (const [pattern, mileage] of Object.entries(MILEAGE_PATTERNS)) {
    if (lower.startsWith(pattern.toLowerCase())) {
      return mileage;
    }
  }
  return null;
}

/**
 * Parse term header like "1+23" to { initialMonths: 1, term: 24 }
 */
function parseTerm(header: unknown): { initialMonths: number; term: number } | null {
  if (!header || typeof header !== "string") return null;
  const match = header.trim().match(TERM_PATTERN);
  if (!match) return null;

  const initialMonths = parseInt(match[1], 10);
  const remainingMonths = parseInt(match[2], 10);
  const term = remainingMonths + 1;

  return { initialMonths, term };
}

/**
 * Normalize manufacturer name from sheet name
 */
function normalizeManufacturer(sheetName: string): string {
  let mfr = sheetName.replace(/_+$/, "").replace(/_/g, " ").trim();
  return MANUFACTURER_MAP[sheetName] || MANUFACTURER_MAP[mfr] || mfr;
}

/**
 * Parse vehicle name to extract model and variant
 */
function parseVehicleName(name: string, manufacturer: string): { model: string; variant: string } {
  let cleaned = name.trim();
  const mfrLower = manufacturer.toLowerCase();

  if (cleaned.toLowerCase().startsWith(mfrLower)) {
    cleaned = cleaned.substring(manufacturer.length).trim();
  }

  // Remove year in parentheses
  cleaned = cleaned.replace(/\s*\(\d{4}\)\s*/g, " ").trim();

  // Remove body type suffixes
  const bodyTypes = ["ESTATE", "HATCHBACK", "SALOON", "SUV", "COUPE", "CONVERTIBLE"];
  for (const body of bodyTypes) {
    cleaned = cleaned.replace(new RegExp(`\\s+${body}\\s*`, "gi"), " ").trim();
  }

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) {
    return { model: name, variant: "" };
  }

  let modelEndIndex = 1;
  if (words.length > 1) {
    const secondWord = words[1];
    if (/^\d+$/.test(secondWord) ||
        ["Mach", "Pro", "Max", "Plus", "GT", "RS", "ST"].includes(secondWord)) {
      modelEndIndex = 2;
    }
    if (words.length > 2 && words[1] === "Mach" && words[2] === "E") {
      modelEndIndex = 3;
    }
  }

  const model = words.slice(0, modelEndIndex).join(" ");
  const variant = words.slice(modelEndIndex).join(" ");

  return { model, variant };
}

/**
 * Parse a worksheet into rates using the matrix format
 */
function parseSheet(sheet: XLSX.WorkSheet, manufacturer: string): ParsedRate[] {
  const rates: ParsedRate[] = [];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  if (!data || data.length === 0) return rates;

  let termColumns: Array<{ col: number; initialMonths: number; term: number }> = [];
  let currentVehicle: { name: string; model: string; variant: string } | null = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCol = String(row[0] || "").toLowerCase().trim();

    // Skip header/info rows
    if (firstCol.includes("venus fleet") ||
        firstCol.includes("all rentals are") ||
        firstCol.includes("add vat for") ||
        firstCol.includes("base rates") ||
        firstCol.includes("none maintained") ||
        firstCol.includes("rates in red") ||
        firstCol.includes("click here") ||
        firstCol.includes("comms payable")) {
      continue;
    }

    // Check if this is a "Term" header row
    const termColIndex = row.findIndex(c => String(c || "").toLowerCase() === "term");
    if (termColIndex >= 0 && termColIndex <= 2) {
      const termColumnsFound: typeof termColumns = [];
      for (let j = termColIndex + 1; j < row.length; j++) {
        const termInfo = parseTerm(row[j]);
        if (termInfo) {
          termColumnsFound.push({ col: j, ...termInfo });
        }
      }
      if (termColumnsFound.length >= 3) {
        termColumns = termColumnsFound;
        continue;
      }
    }

    // Matrix format processing
    if (termColumns.length > 0) {
      const col0 = String(row[0] || "").trim();
      const col1 = String(row[1] || "").trim();
      const mileageCol0 = parseMileage(col0);
      const mileageCol1 = parseMileage(col1);
      const hasPrice = termColumns.some(tc => parsePriceToPence(row[tc.col]) !== null);

      // Skip info rows
      const isInfoRow = col0.toLowerCase().includes("free paint") ||
          col0.toLowerCase().includes("metallic") ||
          col0.toLowerCase().includes("business contract") ||
          col0.toLowerCase().includes("personal contract") ||
          col0.toLowerCase().includes("pre reg") ||
          col0.toLowerCase().includes("solid paint");

      // Case 1: Vehicle name + mileage on same row
      if (!mileageCol0 && mileageCol1 && col0.length > 3 && hasPrice && !isInfoRow) {
        const { model, variant } = parseVehicleName(col0, manufacturer);
        currentVehicle = { name: col0, model, variant };

        for (const termCol of termColumns) {
          const pricePence = parsePriceToPence(row[termCol.col]);
          if (pricePence && pricePence > 0) {
            const paymentPlan = PAYMENT_PLAN_MAP[termCol.initialMonths] || "spread_6_down";
            rates.push({
              manufacturer,
              model: currentVehicle.model,
              variant: currentVehicle.variant,
              term: termCol.term,
              annualMileage: mileageCol1,
              paymentPlan,
              initialMonths: termCol.initialMonths,
              monthlyRentalPence: pricePence,
              vehicleName: currentVehicle.name,
            });
          }
        }
        continue;
      }

      // Case 2: Mileage-only row (continuation)
      if (mileageCol1 && currentVehicle && hasPrice && (col0 === "" || isInfoRow)) {
        for (const termCol of termColumns) {
          const pricePence = parsePriceToPence(row[termCol.col]);
          if (pricePence && pricePence > 0) {
            const paymentPlan = PAYMENT_PLAN_MAP[termCol.initialMonths] || "spread_6_down";
            rates.push({
              manufacturer,
              model: currentVehicle.model,
              variant: currentVehicle.variant,
              term: termCol.term,
              annualMileage: mileageCol1,
              paymentPlan,
              initialMonths: termCol.initialMonths,
              monthlyRentalPence: pricePence,
              vehicleName: currentVehicle.name,
            });
          }
        }
        continue;
      }

      // Case 3: Vehicle name only row
      if (!mileageCol0 && !mileageCol1 && col0.length > 3 && !isInfoRow) {
        if (col0.match(/^\w+\s+\d|^\d+\.\d+|Auto|Manual|Estate|Hatchback|SUV/i)) {
          const { model, variant } = parseVehicleName(col0, manufacturer);
          currentVehicle = { name: col0, model, variant };
          continue;
        }
      }

      // Case 4: Mileage in first column
      if (mileageCol0 && currentVehicle && hasPrice) {
        for (const termCol of termColumns) {
          const pricePence = parsePriceToPence(row[termCol.col]);
          if (pricePence && pricePence > 0) {
            const paymentPlan = PAYMENT_PLAN_MAP[termCol.initialMonths] || "spread_6_down";
            rates.push({
              manufacturer,
              model: currentVehicle.model,
              variant: currentVehicle.variant,
              term: termCol.term,
              annualMileage: mileageCol0,
              paymentPlan,
              initialMonths: termCol.initialMonths,
              monthlyRentalPence: pricePence,
              vehicleName: currentVehicle.name,
            });
          }
        }
      }
    }
  }

  return rates;
}

/**
 * Try to match a rate to a vehicle in the database
 */
async function findMatchingVehicle(
  manufacturer: string,
  model: string,
  variant: string
): Promise<{ id: string; capCode: string | null } | null> {
  // Try exact match first
  const exactMatch = await db
    .select({ id: vehicles.id, capCode: vehicles.capCode })
    .from(vehicles)
    .where(
      and(
        ilike(vehicles.manufacturer, manufacturer),
        ilike(vehicles.model, `%${model}%`),
        variant ? ilike(vehicles.variant, `%${variant.substring(0, 20)}%`) : sql`true`
      )
    )
    .limit(1);

  if (exactMatch.length > 0) {
    return { id: exactMatch[0].id, capCode: exactMatch[0].capCode };
  }

  // Try looser match on model only
  const modelMatch = await db
    .select({ id: vehicles.id, capCode: vehicles.capCode })
    .from(vehicles)
    .where(
      and(
        ilike(vehicles.manufacturer, manufacturer),
        ilike(vehicles.model, `%${model}%`)
      )
    )
    .limit(1);

  if (modelMatch.length > 0) {
    return { id: modelMatch[0].id, capCode: modelMatch[0].capCode };
  }

  return null;
}

/**
 * POST /api/admin/uploader/venus
 * Upload and process Venus Excel workbook
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get Venus provider
    const venusProvider = await db
      .select()
      .from(financeProviders)
      .where(eq(financeProviders.code, "venus"))
      .limit(1);

    if (venusProvider.length === 0) {
      return NextResponse.json({ error: "Venus provider not found in database" }, { status: 500 });
    }

    const providerId = venusProvider[0].id;
    const batchId = `venus_upload_${Date.now()}`;

    // Mark previous Venus imports as not latest
    await db
      .update(ratebookImports)
      .set({ isLatest: false })
      .where(and(
        eq(ratebookImports.providerCode, "venus"),
        eq(ratebookImports.isLatest, true)
      ));

    // Create import record
    const [importRecord] = await db
      .insert(ratebookImports)
      .values({
        providerId,
        providerCode: "venus",
        contractType: "CHNM",
        batchId,
        fileName: file.name,
        status: "processing",
        isLatest: true,
        startedAt: new Date(),
      })
      .returning();

    const importId = importRecord.id;

    const stats: ImportStats = {
      totalRates: 0,
      insertedRates: 0,
      skippedRates: 0,
      errors: [],
      matchedVehicles: new Set(),
      unmatchedVehicles: new Set(),
      sheetsProcessed: [],
    };

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      // Skip certain sheets
      if (SKIP_SHEETS.some(skip => sheetName.toLowerCase().includes(skip.toLowerCase()))) {
        continue;
      }

      const manufacturer = normalizeManufacturer(sheetName);
      const sheet = workbook.Sheets[sheetName];
      const rates = parseSheet(sheet, manufacturer);

      if (rates.length === 0) continue;

      stats.sheetsProcessed.push(sheetName);
      stats.totalRates += rates.length;

      // Prepare rates for insertion
      const ratesToInsert: Array<typeof providerRates.$inferInsert> = [];

      for (const rate of rates) {
        const vehicleKey = `${rate.manufacturer}|${rate.model}|${rate.variant}`;
        const match = await findMatchingVehicle(rate.manufacturer, rate.model, rate.variant);

        if (match) {
          stats.matchedVehicles.add(vehicleKey);
        } else {
          stats.unmatchedVehicles.add(vehicleKey);
        }

        ratesToInsert.push({
          capCode: match?.capCode || null,
          importId,
          providerCode: "venus",
          contractType: "CHNM",
          manufacturer: rate.manufacturer,
          model: rate.model,
          variant: rate.variant,
          term: rate.term,
          annualMileage: rate.annualMileage,
          paymentPlan: rate.paymentPlan,
          totalRental: rate.monthlyRentalPence,
          isCommercial: false,
        });
      }

      // Insert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < ratesToInsert.length; i += batchSize) {
        const batch = ratesToInsert.slice(i, i + batchSize);
        try {
          await db.insert(providerRates).values(batch);
          stats.insertedRates += batch.length;
        } catch (e) {
          stats.errors.push(`Batch insert error for ${sheetName}: ${e}`);
          stats.skippedRates += batch.length;
        }
      }
    }

    // Update import record
    await db
      .update(ratebookImports)
      .set({
        status: "completed",
        totalRows: stats.totalRates,
        successRows: stats.insertedRates,
        errorRows: stats.skippedRates,
        completedAt: new Date(),
        errorLog: stats.errors.length > 0 ? stats.errors : null,
      })
      .where(eq(ratebookImports.id, importId));

    return NextResponse.json({
      success: true,
      message: `Imported ${stats.insertedRates.toLocaleString()} rates from ${stats.sheetsProcessed.length} manufacturers`,
      stats: {
        totalRates: stats.totalRates,
        insertedRates: stats.insertedRates,
        matchedVehicles: stats.matchedVehicles.size,
        unmatchedVehicles: stats.unmatchedVehicles.size,
        sheetsProcessed: stats.sheetsProcessed,
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    });
  } catch (error) {
    console.error("Venus upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
