/**
 * Matrix Parser
 *
 * Parses complex matrix-format ratebooks where:
 * - Vehicle info is in sheet name and/or header cells
 * - Rows are payment profiles (e.g., 1+23, 3+35, 6+47)
 * - Columns are mileage bands (e.g., 5000, 8000, 10000)
 * - May have sub-columns for maintained vs non-maintained
 */

import * as XLSX from "xlsx";
import type {
  ParsedRate,
  SheetAnalysis,
  MatrixInfo,
  ExtractedVehicleInfo,
  ContractType,
  SmartImportResult,
} from "./types";

const PAYMENT_PROFILE_REGEX = /^(\d{1,2})\+(\d{1,2})$/;

interface MatrixParserOptions {
  providerCode: string;
  defaultContractType?: ContractType;
  defaultManufacturer?: string;
}

/**
 * Parse all matrix sheets in a workbook
 */
export function parseMatrixWorkbook(
  fileContent: Buffer | string,
  analyses: SheetAnalysis[],
  options: MatrixParserOptions
): SmartImportResult {
  const buffer = typeof fileContent === "string"
    ? Buffer.from(fileContent, "base64")
    : fileContent;

  const wb = XLSX.read(buffer, { type: "buffer" });

  const rates: ParsedRate[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let processedSheets = 0;

  for (const analysis of analyses) {
    if (analysis.format !== "matrix" || !analysis.matrixInfo) {
      continue;
    }

    const ws = wb.Sheets[analysis.name];
    if (!ws) {
      errors.push(`Sheet "${analysis.name}" not found`);
      continue;
    }

    try {
      const sheetRates = parseMatrixSheet(
        ws,
        analysis.name,
        analysis.matrixInfo,
        analysis.vehicleInfo,
        options
      );

      rates.push(...sheetRates.rates);
      errors.push(...sheetRates.errors);
      warnings.push(...sheetRates.warnings);
      processedSheets++;
    } catch (e) {
      errors.push(`Error parsing sheet "${analysis.name}": ${e}`);
    }
  }

  return {
    success: errors.length === 0 || rates.length > 0,
    format: "matrix",
    totalSheets: analyses.filter((a) => a.format === "matrix").length,
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
 * Parse a single matrix sheet
 */
function parseMatrixSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  matrixInfo: MatrixInfo,
  vehicleInfo: ExtractedVehicleInfo | undefined,
  options: MatrixParserOptions
): { rates: ParsedRate[]; errors: string[]; warnings: string[] } {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });
  const rates: ParsedRate[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract vehicle details
  const manufacturer = vehicleInfo?.manufacturer || options.defaultManufacturer || "Unknown";
  const variant = vehicleInfo?.variant || sheetName;
  const capCode = vehicleInfo?.capCode;
  const capId = vehicleInfo?.capId;
  const quoteNumber = vehicleInfo?.quoteNumber;
  const otr = vehicleInfo?.otr;

  // Parse model from variant if possible
  const model = extractModelFromVariant(variant, manufacturer);

  // Determine mileage bands from column headers
  const mileageBands = parseMileageHeaders(data, matrixInfo);
  if (mileageBands.length === 0) {
    errors.push(`No mileage bands found in sheet "${sheetName}"`);
    return { rates, errors, warnings };
  }

  // Determine if we have maintenance sub-columns
  const maintenanceColumns = parseMaintenanceColumns(data, matrixInfo, mileageBands);

  // Process each payment profile row
  for (let rowIdx = matrixInfo.dataStartRow; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;

    // Check if this is a payment profile row
    const firstCell = String(row[0] || "").trim();
    const profileMatch = firstCell.match(PAYMENT_PROFILE_REGEX);

    if (!profileMatch) {
      // Check if this is a section header (BCH, HCH, etc.)
      const upperCell = firstCell.toUpperCase();
      if (["BCH", "HCH", "PCH", "BSSNL", "CH", "CHNM", "PCHNM"].includes(upperCell)) {
        // Update contract type for subsequent rows
        continue;
      }

      // Check for mileage row labels (alternative format)
      const mileageValue = parseMileageValue(firstCell);
      if (mileageValue) {
        // This is a mileage row - process differently
        const mileageRates = processMileageRow(
          row,
          mileageValue,
          matrixInfo,
          data,
          rowIdx,
          {
            manufacturer,
            model,
            variant,
            capCode,
            capId,
            quoteNumber,
            otr,
            sheetName,
            contractType: options.defaultContractType || "BCH",
          }
        );
        rates.push(...mileageRates);
        continue;
      }

      continue;
    }

    // Parse payment profile
    const initialMonths = parseInt(profileMatch[1]);
    const monthlyPayments = parseInt(profileMatch[2]);
    const term = initialMonths + monthlyPayments;
    const paymentProfile = firstCell;

    // Determine contract type from section or default
    const contractType = determineContractType(
      data,
      rowIdx,
      matrixInfo,
      options.defaultContractType
    );

    // Process each mileage column
    for (const mileageCol of mileageBands) {
      // Check if there are maintenance sub-columns
      const maintCol = maintenanceColumns.find(
        (mc) => mc.mileage === mileageCol.mileage && mc.isMaintained
      );
      const nonMaintCol = maintenanceColumns.find(
        (mc) => mc.mileage === mileageCol.mileage && !mc.isMaintained
      );

      if (maintCol && nonMaintCol) {
        // Both maintained and non-maintained columns
        const maintValue = row[maintCol.col];
        const nonMaintValue = row[nonMaintCol.col];

        if (maintValue && typeof maintValue === "number") {
          rates.push(createRate({
            manufacturer,
            model,
            variant,
            capCode,
            capId,
            quoteNumber,
            otr,
            term,
            annualMileage: mileageCol.mileage,
            initialMonths,
            paymentProfile,
            contractType,
            monthlyRental: Math.round(maintValue * 100),
            isMaintained: true,
            sourceSheet: sheetName,
            sourceRow: rowIdx,
            sourceCol: maintCol.col,
          }));
        }

        if (nonMaintValue && typeof nonMaintValue === "number") {
          rates.push(createRate({
            manufacturer,
            model,
            variant,
            capCode,
            capId,
            quoteNumber,
            otr,
            term,
            annualMileage: mileageCol.mileage,
            initialMonths,
            paymentProfile,
            contractType,
            monthlyRental: Math.round(nonMaintValue * 100),
            isMaintained: false,
            sourceSheet: sheetName,
            sourceRow: rowIdx,
            sourceCol: nonMaintCol.col,
          }));
        }
      } else {
        // Single column for this mileage
        const value = row[mileageCol.col];
        if (value && typeof value === "number") {
          // Determine if maintained from column header or contract type
          const isMaintained = determineMaintenance(contractType, mileageCol);

          rates.push(createRate({
            manufacturer,
            model,
            variant,
            capCode,
            capId,
            quoteNumber,
            otr,
            term,
            annualMileage: mileageCol.mileage,
            initialMonths,
            paymentProfile,
            contractType,
            monthlyRental: Math.round(value * 100),
            isMaintained,
            sourceSheet: sheetName,
            sourceRow: rowIdx,
            sourceCol: mileageCol.col,
          }));
        }
      }
    }
  }

  if (rates.length === 0) {
    warnings.push(`No rates extracted from sheet "${sheetName}"`);
  }

  return { rates, errors, warnings };
}

/**
 * Parse mileage column headers
 */
function parseMileageHeaders(
  data: (string | number)[][],
  matrixInfo: MatrixInfo
): { col: number; mileage: number }[] {
  const mileageBands: { col: number; mileage: number }[] = [];

  // Check the row above data start and 2 rows above
  for (const offset of [1, 2, 3]) {
    const headerRowIdx = matrixInfo.dataStartRow - offset;
    if (headerRowIdx < 0) continue;

    const headerRow = data[headerRowIdx];
    if (!headerRow) continue;

    for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
      const cell = headerRow[colIdx];
      const mileage = parseMileageValue(String(cell || ""));

      if (mileage && !mileageBands.find((mb) => mb.mileage === mileage)) {
        mileageBands.push({ col: colIdx, mileage });
      }
    }

    if (mileageBands.length > 0) break;
  }

  return mileageBands.sort((a, b) => a.col - b.col);
}

/**
 * Parse maintenance sub-columns
 */
function parseMaintenanceColumns(
  data: (string | number)[][],
  matrixInfo: MatrixInfo,
  mileageBands: { col: number; mileage: number }[]
): { col: number; mileage: number; isMaintained: boolean }[] {
  const columns: { col: number; mileage: number; isMaintained: boolean }[] = [];

  // Check row just above data start for maintenance labels
  const subHeaderRowIdx = matrixInfo.dataStartRow - 1;
  if (subHeaderRowIdx < 0) return columns;

  const subHeaderRow = data[subHeaderRowIdx];
  if (!subHeaderRow) return columns;

  for (let colIdx = 1; colIdx < subHeaderRow.length; colIdx++) {
    const cell = String(subHeaderRow[colIdx] || "").toLowerCase();

    // Find which mileage band this column belongs to
    let mileage = 0;
    for (const mb of mileageBands) {
      if (colIdx >= mb.col) {
        mileage = mb.mileage;
      }
    }

    if (!mileage) continue;

    if (cell.includes("non") || cell === "nm" || cell.includes("without")) {
      columns.push({ col: colIdx, mileage, isMaintained: false });
    } else if (cell.includes("maint") || cell === "m" || cell.includes("with")) {
      columns.push({ col: colIdx, mileage, isMaintained: true });
    }
  }

  return columns;
}

/**
 * Parse mileage value from various formats
 */
function parseMileageValue(value: string): number | null {
  const cleaned = String(value).replace(/[,\s]/g, "").toLowerCase();

  // Handle "5k -Non Maintai" style
  const kMatch = cleaned.match(/^(\d+)k/);
  if (kMatch) {
    return parseInt(kMatch[1]) * 1000;
  }

  // Handle plain numbers
  const numMatch = cleaned.match(/^(\d{4,5})$/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }

  return null;
}

/**
 * Extract model from variant string
 */
function extractModelFromVariant(variant: string, manufacturer: string): string {
  // Try to extract model name (usually first word after manufacturer is removed)
  const words = variant.split(/\s+/);

  // Common model patterns
  const modelPatterns = [
    "A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4", "Q5", "Q7", "Q8", "e-tron",
    "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "X1", "X2", "X3", "X5", "iX",
    "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "EQA", "EQB", "EQC", "EQE", "EQS",
    "Golf", "Polo", "Tiguan", "T-Roc", "ID.3", "ID.4", "ID.5",
    "Tucson", "Kona", "Ioniq", "Santa Fe",
    "Sportage", "Niro", "EV6", "Sorento",
    "Focus", "Fiesta", "Puma", "Kuga", "Mustang Mach-E",
    "Corsa", "Astra", "Mokka", "Grandland",
    "208", "308", "2008", "3008", "e-208", "e-2008",
    "Atto 2", "Atto 3", "Seal", "Seal U", "Dolphin", "Tang",
  ];

  for (const pattern of modelPatterns) {
    if (variant.toLowerCase().includes(pattern.toLowerCase())) {
      return pattern;
    }
  }

  // Default to first significant word
  return words[0] || "Unknown";
}

/**
 * Determine contract type from surrounding context
 */
function determineContractType(
  data: (string | number)[][],
  currentRow: number,
  matrixInfo: MatrixInfo,
  defaultType?: ContractType
): ContractType {
  // Check for section markers above current row
  for (let rowIdx = currentRow - 1; rowIdx >= Math.max(0, currentRow - 10); rowIdx--) {
    const row = data[rowIdx];
    if (!row) continue;

    for (const cell of row) {
      const val = String(cell || "").toUpperCase().trim();
      if (["BCH", "HCH", "PCH", "BSSNL", "CH", "CHNM", "PCHNM"].includes(val)) {
        return val as ContractType;
      }
    }
  }

  return defaultType || "BCH";
}

/**
 * Determine if rate is maintained based on context
 */
function determineMaintenance(
  contractType: ContractType,
  mileageCol: { col: number; mileage: number }
): boolean {
  // Contract types that typically include maintenance
  if (contractType === "BCH" || contractType === "PCH" || contractType === "CH") {
    return true;
  }

  // Non-maintenance contract types
  if (contractType === "CHNM" || contractType === "PCHNM") {
    return false;
  }

  // Default to non-maintained for BSSNL
  return false;
}

/**
 * Process a row where mileage is the row label (alternative layout)
 */
function processMileageRow(
  row: (string | number)[],
  mileage: number,
  matrixInfo: MatrixInfo,
  data: (string | number)[][],
  rowIdx: number,
  context: {
    manufacturer: string;
    model: string;
    variant: string;
    capCode?: string;
    capId?: string;
    quoteNumber?: string;
    otr?: number;
    sheetName: string;
    contractType: ContractType;
  }
): ParsedRate[] {
  const rates: ParsedRate[] = [];

  // Find payment profile column headers
  const headerRowIdx = matrixInfo.dataStartRow - 1;
  const headerRow = data[headerRowIdx];
  if (!headerRow) return rates;

  for (let colIdx = 1; colIdx < row.length; colIdx++) {
    const value = row[colIdx];
    if (!value || typeof value !== "number") continue;

    // Get payment profile from header
    const headerCell = String(headerRow[colIdx] || "").trim();
    const profileMatch = headerCell.match(PAYMENT_PROFILE_REGEX);

    if (profileMatch) {
      const initialMonths = parseInt(profileMatch[1]);
      const monthlyPayments = parseInt(profileMatch[2]);
      const term = initialMonths + monthlyPayments;

      rates.push(createRate({
        manufacturer: context.manufacturer,
        model: context.model,
        variant: context.variant,
        capCode: context.capCode,
        capId: context.capId,
        quoteNumber: context.quoteNumber,
        otr: context.otr,
        contractType: context.contractType,
        term,
        annualMileage: mileage,
        initialMonths,
        paymentProfile: headerCell,
        monthlyRental: Math.round(value * 100),
        isMaintained: !context.contractType.includes("NM"),
        sourceSheet: context.sheetName,
        sourceRow: rowIdx,
        sourceCol: colIdx,
      }));
    }
  }

  return rates;
}

/**
 * Create a parsed rate object
 */
function createRate(params: {
  manufacturer: string;
  model: string;
  variant: string;
  capCode?: string;
  capId?: string;
  quoteNumber?: string;
  otr?: number;
  term: number;
  annualMileage: number;
  initialMonths: number;
  paymentProfile: string;
  contractType: ContractType;
  monthlyRental: number;
  isMaintained: boolean;
  sourceSheet: string;
  sourceRow: number;
  sourceCol: number;
}): ParsedRate {
  return {
    capCode: params.capCode,
    capId: params.capId,
    manufacturer: params.manufacturer,
    model: params.model,
    variant: params.variant,
    term: params.term,
    annualMileage: params.annualMileage,
    initialMonths: params.initialMonths,
    paymentProfile: params.paymentProfile,
    contractType: params.contractType,
    monthlyRental: params.monthlyRental,
    isMaintained: params.isMaintained,
    otr: params.otr,
    quoteNumber: params.quoteNumber,
    sourceSheet: params.sourceSheet,
    sourceRow: params.sourceRow,
    sourceCol: params.sourceCol,
  };
}
