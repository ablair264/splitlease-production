import { db } from "@/lib/db";
import { ratebookImports, providerRates, financeProviders, vehicles, ogilvieCapMappings } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { parse } from "csv-parse/sync";
import { getCapCodeForVehicle, generateSourceKey, saveMatchResult, findCapCodeMatch, lookupOgilvieCapMapping } from "@/lib/matching/vehicle-matcher";

// Ogilvie CSV column to database field mapping
const OGILVIE_COLUMN_MAP: Record<string, string> = {
  "Derivative Name": "variant",
  "Manufacturer Name": "manufacturer",
  "Range Name": "rangeName", // Additional info
  "Model Name": "model",
  "Fuel Type": "fuelType",
  "Transmission": "transmission",
  "Body Styles": "bodyStyle",
  "CO2 gkm": "co2Gkm",
  "P11D Value": "p11d",
  "Product": "product",
  "Payment Plan": "paymentPlan",
  "Contract Term": "term",
  "Contract Mileage": "annualMileage",
  "Finance Rental Exc. VAT": "leaseRental",
  "Non Finance Rental": "serviceRental",
  "Regular Rental": "totalRental",
  "Monthly Effective Rental": "monthlyEffectiveRental",
  "England BIK At 20%": "bikTaxLowerRate",
  "England BIK At 40%": "bikTaxHigherRate",
  "EC Combined mpg": "fuelEcoCombined",
  "Max EV Range": "wltpEvRange",
  "InsuranceGroup50": "insuranceGroup",
  "Period Whole Life Costs": "wholeLifeCost",
};

// Map Ogilvie payment plans to our enum
const PAYMENT_PLAN_MAP: Record<string, string> = {
  "1 in Advance": "monthly_in_advance",
  "Spread with 3 up front": "spread_3_down",
  "Spread with 6 up front": "spread_6_down",
  "Spread with 9 up front": "spread_9_down",
};

// Map Ogilvie product names to contract types
const PRODUCT_TO_CONTRACT_TYPE: Record<string, string> = {
  "Contract Hire": "CH", // Assuming with maintenance
  "Contract Hire (No Maintenance)": "CHNM",
  "Salary Sacrifice": "BSSNL",
};

export type OgilvieImportResult = {
  success: boolean;
  importId: string;
  batchId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  uniqueCapCodes: number;
  errors: string[];
};

export type OgilvieImportOptions = {
  fileName: string;
  contractType: string; // CH, CHNM (Ogilvie doesn't do personal)
  csvContent: string;
  userId?: string;
};

/**
 * Convert a decimal value (pounds.pence) to pence integer
 */
function toPence(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "" || value === "0") {
    return null;
  }
  const num = typeof value === "string" ? parseFloat(value.replace(/[,£\s]/g, "")) : value;
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/**
 * Parse an integer value
 */
function parseInt2(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseInt(value.replace(/,/g, ""), 10);
  return isNaN(num) ? null : num;
}

/**
 * Generate SHA-256 hash of file content
 */
function generateFileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Generate a unique batch ID
 */
function generateBatchId(contractType: string): string {
  const timestamp = Date.now();
  return `ogilvie_${contractType.toLowerCase()}_${timestamp}`;
}

/**
 * Map payment plan from Ogilvie format to our enum
 */
function mapPaymentPlan(csvValue: string): string {
  // Check exact matches first
  if (PAYMENT_PLAN_MAP[csvValue]) {
    return PAYMENT_PLAN_MAP[csvValue];
  }
  // Check partial matches
  const lowerValue = csvValue.toLowerCase();
  if (lowerValue.includes("spread") && lowerValue.includes("6")) {
    return "spread_6_down";
  }
  if (lowerValue.includes("spread") && lowerValue.includes("3")) {
    return "spread_3_down";
  }
  if (lowerValue.includes("advance") || lowerValue.includes("1 in")) {
    return "monthly_in_advance";
  }
  return "monthly_in_advance";
}

/**
 * Get or create a CAP code match for an Ogilvie vehicle
 * Returns the matched CAP code or null if no match found
 *
 * Priority:
 * 1. Check Ogilvie CAP mappings table (scraped from website) - 100% confidence
 * 2. Check existing confirmed matches in vehicle_cap_matches
 * 3. Fuzzy match against Lex data
 */
async function getOrCreateCapMatch(
  manufacturer: string,
  model: string,
  variant: string | null,
  p11d: number | null,
  derivativeName: string | null
): Promise<string | null> {
  // Priority 1: Check Ogilvie CAP mappings table (from website scrape)
  // This gives us exact CAP IDs directly from Ogilvie's system
  if (derivativeName) {
    const ogilvieMapping = await lookupOgilvieCapMapping(derivativeName);
    if (ogilvieMapping?.capId) {
      // Found exact CAP ID from Ogilvie website - use it directly
      // The capId (e.g., "107366") is stored in provider_rates.cap_code
      // The capCode (e.g., "MEEA003X75HE A4 1") is used to lookup vehicle_id
      const sourceKey = generateSourceKey(manufacturer, model, variant);
      await saveMatchResult({
        sourceKey,
        manufacturer,
        model,
        variant,
        p11d,
        capCode: ogilvieMapping.capId,
        matchedManufacturer: manufacturer,
        matchedModel: model,
        matchedVariant: variant,
        matchedP11d: p11d,
        confidence: 100,
        method: "auto_exact",
      }, "ogilvie");

      return ogilvieMapping.capId;
    }
  }

  // Priority 2: Try to get existing confirmed match
  const capCode = await getCapCodeForVehicle(
    manufacturer,
    model,
    variant,
    p11d,
    "ogilvie"
  );

  if (capCode) {
    return capCode;
  }

  // Priority 3: No confirmed match - fuzzy match against Lex data
  const result = await findCapCodeMatch({ manufacturer, model, variant, p11d });
  await saveMatchResult(result, "ogilvie");

  // Return the CAP code if confidence is high enough (auto-confirmed)
  if (result.confidence >= 90) {
    return result.capCode;
  }

  // Return null for low confidence - needs manual review
  return null;
}

/**
 * Import an Ogilvie ratebook CSV into the unified provider_rates table
 */
export async function importOgilvieRatebook(options: OgilvieImportOptions): Promise<OgilvieImportResult> {
  const { fileName, contractType, csvContent, userId } = options;
  const batchId = generateBatchId(contractType);
  const fileHash = generateFileHash(csvContent);
  const errors: string[] = [];

  // Check for duplicate file
  const existingImport = await db
    .select()
    .from(ratebookImports)
    .where(and(eq(ratebookImports.fileHash, fileHash), eq(ratebookImports.providerCode, "ogilvie")))
    .limit(1);

  if (existingImport.length > 0) {
    return {
      success: false,
      importId: "",
      batchId,
      totalRows: 0,
      successRows: 0,
      errorRows: 0,
      uniqueCapCodes: 0,
      errors: [`Duplicate file detected. This ratebook was already imported on ${existingImport[0].createdAt}`],
    };
  }

  // Get Ogilvie provider ID
  const ogilvieProvider = await db.select().from(financeProviders).where(eq(financeProviders.code, "ogilvie")).limit(1);

  // Mark previous imports for this contract type as not latest
  await db
    .update(ratebookImports)
    .set({ isLatest: false })
    .where(and(eq(ratebookImports.providerCode, "ogilvie"), eq(ratebookImports.contractType, contractType), eq(ratebookImports.isLatest, true)));

  // Create import record
  const [importRecord] = await db
    .insert(ratebookImports)
    .values({
      providerId: ogilvieProvider[0]?.id || null,
      providerCode: "ogilvie",
      contractType,
      batchId,
      fileName,
      fileHash,
      status: "processing",
      isLatest: true,
      startedAt: new Date(),
      createdBy: userId || null,
    })
    .returning();

  const importId = importRecord.id;

  // Parse CSV
  let records: Record<string, string>[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  } catch (e) {
    await db.update(ratebookImports).set({ status: "failed", errorLog: [`CSV parse error: ${e}`] }).where(eq(ratebookImports.id, importId));

    return {
      success: false,
      importId,
      batchId,
      totalRows: 0,
      successRows: 0,
      errorRows: 1,
      uniqueCapCodes: 0,
      errors: [`CSV parse error: ${e}`],
    };
  }

  const totalRows = records.length;
  let successRows = 0;
  let errorRows = 0;
  const capCodes = new Set<string>();
  const BATCH_SIZE = 100;

  // Process in batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const ratesToInsert: (typeof providerRates.$inferInsert)[] = [];

    for (const row of batch) {
      try {
        const manufacturer = row["Manufacturer Name"]?.trim();
        const model = row["Model Name"]?.trim();
        const variant = row["Derivative Name"]?.trim();

        if (!manufacturer || !model) {
          errorRows++;
          errors.push(`Row ${i + batch.indexOf(row) + 2}: Missing manufacturer or model`);
          continue;
        }

        // Parse P11D for matching
        const p11dValue = toPence(row["P11D Value"]);

        // Construct full derivative name as it appears on Ogilvie website
        // Format: "MANUFACTURER MODEL VARIANT (YEAR)" e.g., "ABARTH 500 ELECTRIC HATCHBACK 114kW 42.2kWh 3dr Auto (2023)"
        const yearIntroduced = row["Year Introduced"]?.trim();
        const derivativeFullName = yearIntroduced
          ? `${manufacturer} ${model} ${variant} (${yearIntroduced})`.trim()
          : `${manufacturer} ${model} ${variant}`.trim();

        // Get CAP code via matching system (may be null if no confident match)
        // Priority: Ogilvie CAP mappings → existing confirmed match → fuzzy match
        const capCode = await getOrCreateCapMatch(manufacturer, model, variant || null, p11dValue, derivativeFullName);

        // Skip unmatched vehicles - they need manual review first
        if (!capCode) {
          errorRows++;
          errors.push(`Row ${i + batch.indexOf(row) + 2}: No CAP code match found for ${manufacturer} ${model} - needs manual review`);
          continue;
        }

        capCodes.add(capCode);

        // Determine contract type from Product column or use provided one
        let actualContractType = contractType;
        const product = row["Product"]?.trim() || "";
        if (product && PRODUCT_TO_CONTRACT_TYPE[product]) {
          actualContractType = PRODUCT_TO_CONTRACT_TYPE[product];
        }

        const rate: typeof providerRates.$inferInsert = {
          capCode,
          importId,
          providerCode: "ogilvie",
          contractType: actualContractType,
          manufacturer: manufacturer.toUpperCase(),
          model,
          variant: variant || null,
          isCommercial: false, // Ogilvie is typically fleet/business
          term: parseInt2(row["Contract Term"]) || 36,
          // Ogilvie provides total contract mileage, we need annual
          annualMileage: Math.round((parseInt2(row["Contract Mileage"]) || 10000) / ((parseInt2(row["Contract Term"]) || 36) / 12)),
          paymentPlan: mapPaymentPlan(row["Payment Plan"] || ""),
          totalRental: toPence(row["Regular Rental"]) || toPence(row["Monthly Effective Rental"]) || 0,
          leaseRental: toPence(row["Finance Rental Exc. VAT"]),
          serviceRental: toPence(row["Non Finance Rental"]),
          nonRecoverableVat: null,
          co2Gkm: parseInt2(row["CO2 gkm"]),
          p11d: p11dValue,
          fuelType: row["Fuel Type"] || null,
          transmission: row["Transmission"] || null,
          bodyStyle: row["Body Styles"] || null,
          modelYear: row["Year Introduced"] || null,
          excessMileagePpm: null, // Ogilvie doesn't provide this in standard exports
          financeEmcPpm: null,
          serviceEmcPpm: null,
          wltpEvRange: parseInt2(row["Max EV Range"]),
          wltpEvRangeMin: null,
          wltpEvRangeMax: null,
          wltpEaerMiles: null,
          fuelEcoCombined: row["EC Combined mpg"] || null,
          bikTaxLowerRate: toPence(row["England BIK At 20%"]),
          bikTaxHigherRate: toPence(row["England BIK At 40%"]),
          bikPercent: null,
          wholeLifeCost: toPence(row["Period Whole Life Costs"]),
          estimatedSaleValue: null,
          fuelCostPpm: null,
          insuranceGroup: row["InsuranceGroup50"] || null,
          euroRating: null,
          rdeCertificationLevel: null,
          rawData: null,
        };

        ratesToInsert.push(rate);
        successRows++;
      } catch (e) {
        errorRows++;
        errors.push(`Row ${i + batch.indexOf(row) + 2}: ${e}`);
      }
    }

    // Look up vehicle_ids for all cap_ids in this batch
    // We need to join through ogilvie_cap_mappings since:
    // - provider_rates.cap_code stores the cap_id (e.g., "107366")
    // - ogilvie_cap_mappings.cap_id matches provider_rates.cap_code
    // - ogilvie_cap_mappings.cap_code matches vehicles.cap_code
    if (ratesToInsert.length > 0) {
      const batchCapIds = Array.from(new Set(ratesToInsert.map(r => r.capCode).filter((c): c is string => Boolean(c))));

      if (batchCapIds.length > 0) {
        // Join through ogilvie_cap_mappings to get vehicle IDs
        const vehicleMatches = await db
          .select({
            capId: ogilvieCapMappings.capId,
            vehicleId: vehicles.id
          })
          .from(ogilvieCapMappings)
          .innerJoin(vehicles, eq(vehicles.capCode, ogilvieCapMappings.capCode))
          .where(inArray(ogilvieCapMappings.capId, batchCapIds));

        const capIdToVehicleId = new Map(
          vehicleMatches.map(v => [v.capId, v.vehicleId])
        );

        // Set vehicle_id on each rate
        for (const rate of ratesToInsert) {
          if (rate.capCode) {
            rate.vehicleId = capIdToVehicleId.get(rate.capCode) || null;
          }
        }
      }

      // Bulk insert batch
      try {
        await db.insert(providerRates).values(ratesToInsert);
      } catch (e) {
        errorRows += ratesToInsert.length;
        successRows -= ratesToInsert.length;
        errors.push(`Batch insert error at row ${i}: ${e}`);
      }
    }

    // Update progress
    await db
      .update(ratebookImports)
      .set({
        totalRows,
        successRows,
        errorRows,
        uniqueCapCodes: capCodes.size,
      })
      .where(eq(ratebookImports.id, importId));
  }

  // Finalize import
  const finalStatus = errorRows > totalRows / 2 ? "failed" : "completed";
  await db
    .update(ratebookImports)
    .set({
      status: finalStatus,
      totalRows,
      successRows,
      errorRows,
      uniqueCapCodes: capCodes.size,
      errorLog: errors.length > 0 ? errors.slice(0, 100) : null,
      completedAt: new Date(),
    })
    .where(eq(ratebookImports.id, importId));

  // Match vehicle IDs for this import using PostgreSQL function
  // This handles: cap_code match → cap_id match → ogilvie_cap_mappings lookup
  try {
    await db.execute(
      sql`SELECT * FROM match_ogilvie_vehicle_ids_for_import(${importId}::uuid)`
    );
  } catch (e) {
    console.error("Failed to match vehicle IDs for import:", e);
    // Non-fatal - rates are still imported, just without vehicle_id links
  }

  return {
    success: finalStatus === "completed",
    importId,
    batchId,
    totalRows,
    successRows,
    errorRows,
    uniqueCapCodes: capCodes.size,
    errors: errors.slice(0, 20),
  };
}

/**
 * Get import status by batch ID
 */
export async function getOgilvieImportStatus(batchId: string) {
  const [importRecord] = await db.select().from(ratebookImports).where(eq(ratebookImports.batchId, batchId)).limit(1);

  return importRecord || null;
}
