/**
 * Smart Importer
 *
 * Main entry point for the smart import system.
 * Coordinates format detection, parsing, and database import.
 */

import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { ratebookImports, providerRates, vehicles } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createHash } from "crypto";

import { detectFormat } from "./format-detector";
import { parseMatrixWorkbook } from "./matrix-parser";
import type {
  SmartImportOptions,
  SmartImportResult,
  ParsedRate,
  DetectionResult,
  ContractType,
} from "./types";

/**
 * Analyze a file without importing - for preview
 */
export async function analyzeFile(
  fileContent: Buffer | string,
  fileName: string
): Promise<DetectionResult & { preview: ParsedRate[] }> {
  const detection = detectFormat(fileContent);

  let preview: ParsedRate[] = [];

  if (detection.format === "matrix") {
    const matrixSheets = detection.sheets.filter((s) => s.format === "matrix");
    if (matrixSheets.length > 0) {
      const result = parseMatrixWorkbook(fileContent, matrixSheets, {
        providerCode: "preview",
        defaultManufacturer: "Unknown",
      });
      preview = result.rates.slice(0, 20); // First 20 rates for preview
    }
  } else if (detection.format === "tabular") {
    // For tabular, extract sample rows using detected column mappings
    const buffer = typeof fileContent === "string"
      ? Buffer.from(fileContent, "base64")
      : fileContent;
    const wb = XLSX.read(buffer, { type: "buffer" });

    for (const analysis of detection.sheets) {
      if (analysis.format === "tabular" && analysis.columns && analysis.headerRow !== undefined) {
        const ws = wb.Sheets[analysis.name];
        if (!ws) continue;

        const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });

        // Build column mapping from detected columns
        const columnMap: Record<string, number> = {};
        for (const col of analysis.columns) {
          if (col.targetField) {
            columnMap[col.targetField] = col.sourceColumn;
          }
        }

        const getValue = (row: (string | number)[], field: string): string | number | null => {
          const col = columnMap[field];
          return col !== undefined ? row[col] : null;
        };

        // Process first 10 data rows for preview
        for (let rowIdx = analysis.headerRow + 1; rowIdx < Math.min(analysis.headerRow + 11, data.length); rowIdx++) {
          const row = data[rowIdx];
          if (!row || row.every((c) => !c)) continue;

          const rental = Number(getValue(row, "monthlyRental")) || 0;
          if (rental <= 0) continue;

          preview.push({
            manufacturer: String(getValue(row, "manufacturer") || "Unknown"),
            model: String(getValue(row, "model") || "Unknown"),
            variant: String(getValue(row, "variant") || ""),
            term: Number(getValue(row, "term")) || 36,
            annualMileage: Number(getValue(row, "annualMileage")) || 10000,
            initialMonths: 1,
            paymentProfile: "1+35",
            contractType: "BCH",
            monthlyRental: Math.round(rental * 100),
            isMaintained: true,
            sourceSheet: analysis.name,
            sourceRow: rowIdx,
            sourceCol: 0,
            capCode: String(getValue(row, "capCode") || ""),
            capId: String(getValue(row, "capId") || ""),
            otr: getValue(row, "otr") ? Math.round(Number(getValue(row, "otr")) * 100) : undefined,
            p11d: getValue(row, "p11d") ? Math.round(Number(getValue(row, "p11d")) * 100) : undefined,
          });
        }
      }
    }
  }

  return { ...detection, preview };
}

/**
 * Smart import - detect format and import appropriately
 */
export async function smartImport(
  options: SmartImportOptions
): Promise<SmartImportResult> {
  const { fileName, fileContent, providerCode, contractType, userId, dryRun, columnMappings } = options;

  const buffer = typeof fileContent === "string"
    ? Buffer.from(fileContent, "base64")
    : fileContent;

  const fileHash = createHash("sha256").update(buffer).digest("hex");

  // Check for duplicate (skip if dry run or forceReimport)
  if (!dryRun && !options.forceReimport) {
    const existing = await db
      .select()
      .from(ratebookImports)
      .where(eq(ratebookImports.fileHash, fileHash))
      .limit(1);

    if (existing.length > 0) {
      // Allow reimport if previous import failed
      if (existing[0].status === "failed" || existing[0].status === "processing") {
        // Delete the failed/stuck import to allow reimport
        await db.delete(ratebookImports).where(eq(ratebookImports.id, existing[0].id));
      } else {
        return {
          success: false,
          format: "unknown",
          totalSheets: 0,
          processedSheets: 0,
          totalRates: 0,
          successRates: 0,
          errorRates: 0,
          rates: [],
          errors: [`Duplicate file - already imported on ${existing[0].createdAt}. Use "Force Reimport" to import again.`],
          warnings: [],
        };
      }
    }
  }

  // Detect format
  const detection = detectFormat(buffer);

  if (detection.format === "unknown") {
    return {
      success: false,
      format: "unknown",
      totalSheets: detection.sheets.length,
      processedSheets: 0,
      totalRates: 0,
      successRates: 0,
      errorRates: 0,
      rates: [],
      errors: ["Could not detect file format. Please ensure the file has recognizable headers or matrix structure."],
      warnings: [],
    };
  }

  let result: SmartImportResult;

  if (detection.format === "matrix") {
    result = parseMatrixWorkbook(buffer, detection.sheets, {
      providerCode,
      defaultContractType: contractType,
    });
  } else {
    // Tabular format - use existing column-based parser
    result = await parseTabularWorkbook(buffer, detection, {
      providerCode,
      contractType,
      columnMappings, // Pass custom column mappings
    });
  }

  // If dry run, return without saving
  if (dryRun) {
    return result;
  }

  // Save to database
  if (result.rates.length > 0) {
    const saveResult = await saveRatesToDatabase(
      result.rates,
      {
        fileName,
        fileHash,
        providerCode,
        contractType: contractType || "BCH",
        userId,
        format: detection.format,
      }
    );

    result.successRates = saveResult.successCount;
    result.errorRates = saveResult.errorCount;
    result.errors.push(...saveResult.errors);
  }

  return result;
}

/**
 * Parse tabular format workbook
 */
async function parseTabularWorkbook(
  buffer: Buffer,
  detection: DetectionResult,
  options: { providerCode: string; contractType?: ContractType; columnMappings?: Record<number, string> }
): Promise<SmartImportResult> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rates: ParsedRate[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedSheets = 0;

  for (const analysis of detection.sheets) {
    if (analysis.format !== "tabular" || !analysis.columns || analysis.headerRow === undefined) {
      continue;
    }

    const ws = wb.Sheets[analysis.name];
    if (!ws) continue;

    const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });
    const headerRow = analysis.headerRow;

    // Build column mapping - use custom mappings if provided, otherwise use auto-detected
    const columnMap: Record<string, number> = {};
    if (options.columnMappings) {
      // Use custom mappings: { sourceColumn: targetField }
      for (const [sourceCol, targetField] of Object.entries(options.columnMappings)) {
        columnMap[targetField] = parseInt(sourceCol);
      }
    } else {
      // Use auto-detected mappings
      for (const col of analysis.columns) {
        if (col.targetField) {
          columnMap[col.targetField] = col.sourceColumn;
        }
      }
    }

    // Process data rows
    for (let rowIdx = headerRow + 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.every((c) => !c)) continue;

      try {
        const getValue = (field: string): string | number | null => {
          const col = columnMap[field];
          return col !== undefined ? row[col] : null;
        };

        const capCode = String(getValue("capCode") || "").trim();
        const capId = String(getValue("capId") || "").trim();

        if (!capCode && !capId) {
          continue; // Skip rows without vehicle identifier
        }

        const term = Number(getValue("term")) || 36;
        const mileage = Number(getValue("annualMileage")) || 10000;
        const rental = Number(getValue("monthlyRental")) || 0;

        if (rental <= 0) {
          continue; // Skip rows without rental
        }

        // Helper to get numeric value in pence (multiply by 100)
        const getPence = (field: string): number | undefined => {
          const val = getValue(field);
          if (!val) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : Math.round(num * 100);
        };

        // Helper to get integer value (rounds decimals)
        const getInt = (field: string): number | undefined => {
          const val = getValue(field);
          if (!val) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : Math.round(num);
        };

        // Helper to get decimal value (for numeric columns that allow decimals)
        const getDecimal = (field: string): number | undefined => {
          const val = getValue(field);
          if (!val) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        };

        // Helper to get string value
        const getStr = (field: string): string | undefined => {
          const val = getValue(field);
          return val ? String(val).trim() : undefined;
        };

        rates.push({
          // Identifiers
          capCode: capCode || undefined,
          capId: capId || undefined,
          // Vehicle info
          manufacturer: String(getValue("manufacturer") || "Unknown"),
          model: String(getValue("model") || "Unknown"),
          variant: getStr("variant"),
          bodyStyle: getStr("bodyStyle"),
          modelYear: getStr("modelYear"),
          // Contract terms
          term,
          annualMileage: mileage,
          initialMonths: 1,
          paymentProfile: `1+${term - 1}`,
          paymentPlan: getStr("paymentPlan"),
          contractType: options.contractType || "BCH",
          // Pricing (convert to pence)
          monthlyRental: Math.round(rental * 100),
          leaseRental: getPence("leaseRental"),
          serviceRental: getPence("serviceRental"),
          nonRecoverableVat: getPence("nonRecoverableVat"),
          basicListPrice: getPence("basicListPrice"),
          otr: getPence("otr"),
          p11d: getPence("p11d"),
          isMaintained: true,
          // Vehicle specs
          co2: getInt("co2"),
          fuelType: getStr("fuelType"),
          transmission: getStr("transmission"),
          // Excess mileage (already in pence per mile typically)
          excessMileagePpm: getInt("excessMileagePpm"),
          financeEmcPpm: getInt("financeEmcPpm"),
          serviceEmcPpm: getInt("serviceEmcPpm"),
          // EV/Hybrid
          wltpEvRange: getInt("wltpEvRange"),
          wltpEvRangeMin: getInt("wltpEvRangeMin"),
          wltpEvRangeMax: getInt("wltpEvRangeMax"),
          wltpEaerMiles: getInt("wltpEaerMiles"),
          fuelEcoCombined: getDecimal("fuelEcoCombined"), // MPG can be decimal
          // BIK / Salary Sacrifice
          bikTaxLowerRate: getPence("bikTaxLowerRate"),
          bikTaxHigherRate: getPence("bikTaxHigherRate"),
          bikPercent: getDecimal("bikPercent"), // Percentage can be decimal
          // Cost analysis
          wholeLifeCost: getPence("wholeLifeCost"),
          estimatedSaleValue: getPence("estimatedSaleValue"),
          fuelCostPpm: getInt("fuelCostPpm"),
          insuranceGroup: getStr("insuranceGroup"),
          // Ratings
          euroRating: getStr("euroRating"),
          rdeCertificationLevel: getStr("rdeCertificationLevel"),
          // Source tracking
          sourceSheet: analysis.name,
          sourceRow: rowIdx,
          sourceCol: 0,
        });
      } catch (e) {
        errors.push(`Row ${rowIdx + 1} in ${analysis.name}: ${e}`);
      }
    }

    processedSheets++;
  }

  return {
    success: rates.length > 0,
    format: "tabular",
    totalSheets: detection.sheets.filter((s) => s.format === "tabular").length,
    processedSheets,
    totalRates: rates.length,
    successRates: rates.length,
    errorRates: 0,
    rates,
    errors,
    warnings,
  };
}

/**
 * Save parsed rates to database
 */
async function saveRatesToDatabase(
  rates: ParsedRate[],
  options: {
    fileName: string;
    fileHash: string;
    providerCode: string;
    contractType: ContractType;
    userId?: string;
    format: string;
  }
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Create import record
  const batchId = `smart_${options.providerCode}_${Date.now()}`;

  const [importRecord] = await db
    .insert(ratebookImports)
    .values({
      providerCode: options.providerCode,
      contractType: options.contractType,
      batchId,
      fileName: options.fileName,
      fileHash: options.fileHash,
      status: "processing",
      isLatest: true,
      startedAt: new Date(),
      createdBy: options.userId || null,
    })
    .returning();

  const importId = importRecord.id;

  // Collect all CAP codes/IDs for vehicle lookup
  const capCodes = [...new Set(rates.map((r) => r.capCode).filter(Boolean))] as string[];
  const capIds = [...new Set(rates.map((r) => r.capId).filter(Boolean))] as string[];

  // Look up vehicles
  let vehicleMap = new Map<string, string>(); // capCode/capId -> vehicleId

  if (capCodes.length > 0) {
    const vehiclesByCode = await db
      .select({ id: vehicles.id, capCode: vehicles.capCode })
      .from(vehicles)
      .where(inArray(vehicles.capCode, capCodes));

    for (const v of vehiclesByCode) {
      if (v.capCode) vehicleMap.set(v.capCode, v.id);
    }
  }

  if (capIds.length > 0) {
    const vehiclesById = await db
      .select({ id: vehicles.id, capId: vehicles.capId })
      .from(vehicles)
      .where(inArray(vehicles.capId, capIds));

    for (const v of vehiclesById) {
      if (v.capId) vehicleMap.set(v.capId, v.id);
    }
  }

  // Insert rates in batches
  const BATCH_SIZE = 100;

  for (let i = 0; i < rates.length; i += BATCH_SIZE) {
    const batch = rates.slice(i, i + BATCH_SIZE);
    const ratesToInsert = [];

    for (const rate of batch) {
      const vehicleId = (rate.capCode && vehicleMap.get(rate.capCode)) ||
        (rate.capId && vehicleMap.get(rate.capId)) ||
        null;

      // Map payment profile to payment plan
      const paymentPlan = mapPaymentProfile(rate.paymentProfile);

      ratesToInsert.push({
        // Identifiers
        capCode: rate.capCode || null,
        vehicleId,
        importId,
        providerCode: options.providerCode,
        contractType: rate.contractType,
        // Vehicle info
        manufacturer: rate.manufacturer,
        model: rate.model,
        variant: rate.variant || null,
        bodyStyle: rate.bodyStyle || null,
        modelYear: rate.modelYear || null,
        isCommercial: false,
        // Contract terms
        term: rate.term,
        annualMileage: rate.annualMileage,
        paymentPlan: rate.paymentPlan || paymentPlan,
        // Pricing
        totalRental: rate.monthlyRental,
        leaseRental: rate.leaseRental || (rate.isMaintained ? null : rate.monthlyRental),
        serviceRental: rate.serviceRental || null,
        nonRecoverableVat: rate.nonRecoverableVat || null,
        basicListPrice: rate.basicListPrice || null,
        otrPrice: rate.otr || null,
        p11d: rate.p11d || null,
        // Vehicle specs
        co2Gkm: rate.co2 || null,
        fuelType: rate.fuelType || null,
        transmission: rate.transmission || null,
        // Excess mileage
        excessMileagePpm: rate.excessMileagePpm || null,
        financeEmcPpm: rate.financeEmcPpm || null,
        serviceEmcPpm: rate.serviceEmcPpm || null,
        // EV/Hybrid
        wltpEvRange: rate.wltpEvRange || null,
        wltpEvRangeMin: rate.wltpEvRangeMin || null,
        wltpEvRangeMax: rate.wltpEvRangeMax || null,
        wltpEaerMiles: rate.wltpEaerMiles || null,
        fuelEcoCombined: rate.fuelEcoCombined ? String(rate.fuelEcoCombined) : null,
        // BIK / Salary Sacrifice
        bikTaxLowerRate: rate.bikTaxLowerRate || null,
        bikTaxHigherRate: rate.bikTaxHigherRate || null,
        bikPercent: rate.bikPercent ? String(rate.bikPercent) : null,
        // Cost analysis
        wholeLifeCost: rate.wholeLifeCost || null,
        estimatedSaleValue: rate.estimatedSaleValue || null,
        fuelCostPpm: rate.fuelCostPpm || null,
        insuranceGroup: rate.insuranceGroup || null,
        // Ratings
        euroRating: rate.euroRating || null,
        rdeCertificationLevel: rate.rdeCertificationLevel || null,
      });
    }

    try {
      await db.insert(providerRates).values(ratesToInsert);
      successCount += ratesToInsert.length;
    } catch (e) {
      errorCount += batch.length;
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${e}`);
    }
  }

  // Update import record
  await db
    .update(ratebookImports)
    .set({
      status: errorCount > successCount ? "failed" : "completed",
      totalRows: rates.length,
      successRows: successCount,
      errorRows: errorCount,
      uniqueCapCodes: capCodes.length,
      completedAt: new Date(),
      errorLog: errors.length > 0 ? errors.slice(0, 50) : null,
    })
    .where(eq(ratebookImports.id, importId));

  return { successCount, errorCount, errors };
}

/**
 * Map payment profile to payment plan enum
 */
function mapPaymentProfile(profile: string): string {
  const match = profile.match(/^(\d+)\+(\d+)$/);
  if (!match) return "monthly_in_advance";

  const initial = parseInt(match[1]);

  if (initial === 1) return "monthly_in_advance";
  if (initial === 3) return "spread_3_down";
  if (initial === 6) return "spread_6_down";
  if (initial === 9) return "spread_9_down";
  if (initial === 12) return "spread_12_down";

  return "monthly_in_advance";
}
