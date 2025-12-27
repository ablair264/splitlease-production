/**
 * Format Detector
 *
 * Analyzes Excel files to determine if they're tabular or matrix format
 */

import * as XLSX from "xlsx";
import type {
  DetectionResult,
  SheetAnalysis,
  RatebookFormat,
  ColumnMapping,
  MatrixInfo,
  MatrixSection,
  ExtractedVehicleInfo,
  ContractType,
} from "./types";
import { TABULAR_HEADER_PATTERNS } from "./types";

// Payment profile regex: matches patterns like "1+23", "12+35", "6+42"
const PAYMENT_PROFILE_REGEX = /^(\d{1,2})\+(\d{1,2})$/;

// Mileage pattern: matches "5k", "8000", "10,000", "15k", etc.
const MILEAGE_REGEX = /^(\d{1,2})[,.]?(\d{3})?k?$/i;

// CAP code pattern: alphanumeric with spaces
const CAP_CODE_REGEX = /^[A-Z]{2,4}\d{2,3}[A-Z0-9\s]{5,}$/i;

// CAP ID pattern: numeric only
const CAP_ID_REGEX = /^\d{5,6}$/;

/**
 * Detect the format of an Excel file
 */
export function detectFormat(fileContent: Buffer | string): DetectionResult {
  const buffer = typeof fileContent === "string"
    ? Buffer.from(fileContent, "base64")
    : fileContent;

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheets: SheetAnalysis[] = [];

  let tabularCount = 0;
  let matrixCount = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const analysis = analyzeSheet(ws, sheetName);
    sheets.push(analysis);

    if (analysis.format === "tabular") tabularCount++;
    if (analysis.format === "matrix") matrixCount++;
  }

  // Determine overall format
  let format: RatebookFormat = "unknown";
  let confidence = 0;
  let reason = "";

  if (tabularCount > 0 && matrixCount === 0) {
    format = "tabular";
    confidence = 90;
    reason = `All ${tabularCount} sheets have tabular structure with column headers`;
  } else if (matrixCount > 0 && tabularCount === 0) {
    format = "matrix";
    confidence = 90;
    reason = `All ${matrixCount} sheets have matrix structure with payment profiles`;
  } else if (matrixCount > tabularCount) {
    format = "matrix";
    confidence = 70;
    reason = `${matrixCount}/${sheets.length} sheets are matrix format`;
  } else if (tabularCount > matrixCount) {
    format = "tabular";
    confidence = 70;
    reason = `${tabularCount}/${sheets.length} sheets are tabular format`;
  } else {
    format = "unknown";
    confidence = 30;
    reason = "Could not determine consistent format across sheets";
  }

  return { format, confidence, reason, sheets };
}

/**
 * Analyze a single sheet to determine its format
 */
function analyzeSheet(ws: XLSX.WorkSheet, sheetName: string): SheetAnalysis {
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });

  if (data.length < 3) {
    return { name: sheetName, format: "unknown" };
  }

  // Try to extract vehicle info from sheet name
  const vehicleFromName = extractVehicleFromSheetName(sheetName);

  // Check for tabular format (column headers in first few rows)
  const tabularResult = detectTabular(data);
  if (tabularResult.isTabular) {
    return {
      name: sheetName,
      format: "tabular",
      headerRow: tabularResult.headerRow,
      columns: tabularResult.columns,
      sampleData: extractSampleData(data, tabularResult.headerRow!, 3),
    };
  }

  // Check for matrix format
  const matrixResult = detectMatrix(data, sheetName);
  if (matrixResult.isMatrix) {
    // Extract vehicle info from header cells
    const vehicleFromCells = extractVehicleFromCells(data);

    return {
      name: sheetName,
      format: "matrix",
      matrixInfo: matrixResult.info,
      vehicleInfo: mergeVehicleInfo(vehicleFromName, vehicleFromCells),
    };
  }

  return {
    name: sheetName,
    format: "unknown",
    vehicleInfo: vehicleFromName || undefined,
  };
}

/**
 * Detect if sheet is tabular format
 */
function detectTabular(
  data: (string | number)[][]
): { isTabular: boolean; headerRow?: number; columns?: ColumnMapping[] } {
  // Check first 5 rows for header patterns
  for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length < 3) continue;

    const mappings: ColumnMapping[] = [];
    let matchedHeaders = 0;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellValue = String(row[colIdx] || "").toLowerCase().trim();
      if (!cellValue) continue;

      // Check against known header patterns
      for (const [field, patterns] of Object.entries(TABULAR_HEADER_PATTERNS)) {
        if (patterns.some((p) => cellValue.includes(p) || p.includes(cellValue))) {
          mappings.push({
            sourceColumn: colIdx,
            sourceHeader: String(row[colIdx]),
            targetField: field,
            confidence: cellValue === patterns[0] ? 100 : 80,
          });
          matchedHeaders++;
          break;
        }
      }
    }

    // Need at least 3 recognized headers to be confident
    if (matchedHeaders >= 3) {
      return { isTabular: true, headerRow: rowIdx, columns: mappings };
    }
  }

  return { isTabular: false };
}

/**
 * Detect if sheet is matrix format
 */
function detectMatrix(
  data: (string | number)[][],
  sheetName: string
): { isMatrix: boolean; info?: MatrixInfo } {
  // Look for payment profile patterns in first column (rows)
  const paymentProfileRows: { row: number; profile: string }[] = [];
  const mileageColumns: { col: number; mileage: number }[] = [];

  // Scan first 20 rows for payment profiles
  for (let rowIdx = 0; rowIdx < Math.min(20, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || "").trim();
    const match = firstCell.match(PAYMENT_PROFILE_REGEX);
    if (match) {
      paymentProfileRows.push({ row: rowIdx, profile: firstCell });
    }
  }

  // If we found payment profiles, look for mileage in column headers
  if (paymentProfileRows.length >= 3) {
    // Check row above first payment profile for mileage headers
    const headerRowIdx = paymentProfileRows[0].row - 1;
    if (headerRowIdx >= 0) {
      const headerRow = data[headerRowIdx];
      if (headerRow) {
        for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
          const cellValue = String(headerRow[colIdx] || "").trim();
          const mileageMatch = parseMileage(cellValue);
          if (mileageMatch) {
            mileageColumns.push({ col: colIdx, mileage: mileageMatch });
          }
        }
      }
    }

    // Also check 2 rows above for mileage (in case there's a sub-header)
    if (mileageColumns.length === 0) {
      const headerRowIdx2 = paymentProfileRows[0].row - 2;
      if (headerRowIdx2 >= 0) {
        const headerRow = data[headerRowIdx2];
        if (headerRow) {
          for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
            const cellValue = String(headerRow[colIdx] || "").trim();
            const mileageMatch = parseMileage(cellValue);
            if (mileageMatch) {
              mileageColumns.push({ col: colIdx, mileage: mileageMatch });
            }
          }
        }
      }
    }

    if (mileageColumns.length >= 2) {
      // Check for maintenance sub-columns
      const subHeaderRow = data[paymentProfileRows[0].row - 1];
      const hasSubColumns = subHeaderRow?.some((cell) => {
        const val = String(cell || "").toLowerCase();
        return val.includes("maint") || val.includes("non") || val === "nm";
      });

      // Detect sections (BCH, HCH, etc.)
      const sections = detectSections(data, paymentProfileRows);

      return {
        isMatrix: true,
        info: {
          dataStartRow: paymentProfileRows[0].row,
          dataStartCol: 1,
          rowType: "payment_profile",
          rowLabels: paymentProfileRows.map((p) => p.profile),
          colType: "mileage",
          colLabels: mileageColumns.map((m) => String(m.mileage)),
          hasSubColumns: !!hasSubColumns,
          subColumnLabels: hasSubColumns ? ["Maintained", "Non-Maintained"] : undefined,
          sections,
        },
      };
    }
  }

  // Check for mileage in first column (alternative layout)
  const mileageRows: { row: number; mileage: number }[] = [];
  for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;
    const firstCell = String(row[0] || "").trim();
    const mileageMatch = parseMileage(firstCell);
    if (mileageMatch) {
      mileageRows.push({ row: rowIdx, mileage: mileageMatch });
    }
  }

  if (mileageRows.length >= 3) {
    // Look for payment profiles in column headers
    const headerRowIdx = mileageRows[0].row - 1;
    if (headerRowIdx >= 0) {
      const headerRow = data[headerRowIdx];
      const profileCols: { col: number; profile: string }[] = [];

      if (headerRow) {
        for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
          const cellValue = String(headerRow[colIdx] || "").trim();
          if (PAYMENT_PROFILE_REGEX.test(cellValue)) {
            profileCols.push({ col: colIdx, profile: cellValue });
          }
        }
      }

      if (profileCols.length >= 3) {
        return {
          isMatrix: true,
          info: {
            dataStartRow: mileageRows[0].row,
            dataStartCol: 1,
            rowType: "mileage",
            rowLabels: mileageRows.map((m) => String(m.mileage)),
            colType: "payment_profile",
            colLabels: profileCols.map((p) => p.profile),
            hasSubColumns: false,
          },
        };
      }
    }
  }

  return { isMatrix: false };
}

/**
 * Parse mileage from various formats
 */
function parseMileage(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "").toLowerCase();

  // Handle "5k", "10k", etc.
  const kMatch = cleaned.match(/^(\d+)k$/);
  if (kMatch) {
    return parseInt(kMatch[1]) * 1000;
  }

  // Handle "5000", "10000", etc.
  const numMatch = cleaned.match(/^(\d{4,5})$/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }

  // Handle "5,000" formatted as "5000" after cleaning
  return null;
}

/**
 * Detect contract type sections within a matrix sheet
 */
function detectSections(
  data: (string | number)[][],
  paymentProfiles: { row: number; profile: string }[]
): MatrixSection[] | undefined {
  const sections: MatrixSection[] = [];
  const validContractTypes = ["BCH", "HCH", "PCH", "BSSNL", "CH", "CHNM", "PCHNM"] as const;

  // Look for section headers like "BCH", "HCH", "PCH" in the data
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (const cell of row) {
      const val = String(cell || "").toUpperCase().trim();
      if (validContractTypes.includes(val as ContractType)) {
        // Find the range of this section
        const startRow = rowIdx;
        let endRow = data.length - 1;

        // Look for next section header or end of data
        for (let nextRow = rowIdx + 1; nextRow < data.length; nextRow++) {
          const nextRowData = data[nextRow];
          if (nextRowData?.some((c) => {
            const v = String(c || "").toUpperCase().trim();
            return validContractTypes.includes(v as ContractType) && v !== val;
          })) {
            endRow = nextRow - 1;
            break;
          }
        }

        sections.push({ contractType: val as ContractType, startRow, endRow });
      }
    }
  }

  return sections.length > 0 ? sections : undefined;
}

/**
 * Extract vehicle info from sheet name
 */
function extractVehicleFromSheetName(sheetName: string): ExtractedVehicleInfo | null {
  // Common patterns:
  // "TUCSON 1.6T 150 NLine S"
  // "Seal U Boost"
  // "1.6T Hybrid Ultimate 5dr Auto"

  const parts = sheetName.trim().split(/\s+/);
  if (parts.length < 2) return null;

  // Try to identify manufacturer and model
  const knownManufacturers = [
    "AUDI", "BMW", "MERCEDES", "VW", "VOLKSWAGEN", "HYUNDAI", "KIA",
    "FORD", "VAUXHALL", "PEUGEOT", "CITROEN", "RENAULT", "NISSAN",
    "TOYOTA", "HONDA", "MAZDA", "SKODA", "SEAT", "CUPRA", "BYD",
    "MG", "VOLVO", "JAGUAR", "LAND ROVER", "MINI", "FIAT", "ALFA ROMEO"
  ];

  const upperName = sheetName.toUpperCase();
  let manufacturer: string | undefined;
  let modelStart = 0;

  for (const mfr of knownManufacturers) {
    if (upperName.startsWith(mfr)) {
      manufacturer = mfr;
      modelStart = mfr.length;
      break;
    }
  }

  const variant = manufacturer
    ? sheetName.substring(modelStart).trim()
    : sheetName;

  return {
    manufacturer,
    variant,
    source: "sheet_name",
  };
}

/**
 * Extract vehicle info from header cells
 */
function extractVehicleFromCells(data: (string | number)[][]): ExtractedVehicleInfo | null {
  const info: ExtractedVehicleInfo = { source: "header_cells" };

  // Scan first 5 rows for CAP code, CAP ID, quote number, OTR
  for (let rowIdx = 0; rowIdx < Math.min(5, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || "").trim();
      const nextCell = row[colIdx + 1] ? String(row[colIdx + 1]).trim() : "";

      // CAP Code
      if (cell.toLowerCase().includes("cap code") || cell.toLowerCase() === "capcode") {
        if (CAP_CODE_REGEX.test(nextCell)) {
          info.capCode = nextCell;
        }
      }

      // CAP ID
      if (cell.toLowerCase().includes("cap id") || cell.toLowerCase() === "capid") {
        // May be formatted as "CAP ID - 108321"
        const idMatch = cell.match(/\d{5,6}/);
        if (idMatch) {
          info.capId = idMatch[0];
        } else if (CAP_ID_REGEX.test(nextCell)) {
          info.capId = nextCell;
        }
      }

      // Direct CAP ID check
      if (CAP_ID_REGEX.test(cell) && !info.capId) {
        // Verify it's actually a CAP ID by checking context
        const prevCell = colIdx > 0 ? String(row[colIdx - 1] || "").toLowerCase() : "";
        if (prevCell.includes("cap") || prevCell.includes("id")) {
          info.capId = cell;
        }
      }

      // Quote number
      if (cell.toLowerCase().includes("quote")) {
        const quoteMatch = nextCell.match(/\d{7,}/);
        if (quoteMatch) {
          info.quoteNumber = quoteMatch[0];
        }
      }

      // OTR
      if (cell.toLowerCase() === "otr") {
        const otrValue = parseFloat(String(nextCell).replace(/[£,]/g, ""));
        if (!isNaN(otrValue) && otrValue > 10000) {
          info.otr = Math.round(otrValue * 100); // Convert to pence
        }
      }
    }
  }

  return Object.keys(info).length > 1 ? info : null;
}

/**
 * Merge vehicle info from multiple sources
 */
function mergeVehicleInfo(
  fromName: ExtractedVehicleInfo | null,
  fromCells: ExtractedVehicleInfo | null
): ExtractedVehicleInfo | undefined {
  if (!fromName && !fromCells) return undefined;

  return {
    manufacturer: fromCells?.manufacturer || fromName?.manufacturer,
    model: fromCells?.model || fromName?.model,
    variant: fromCells?.variant || fromName?.variant,
    capCode: fromCells?.capCode,
    capId: fromCells?.capId,
    quoteNumber: fromCells?.quoteNumber,
    otr: fromCells?.otr,
    source: fromName && fromCells ? "both" : (fromCells ? "header_cells" : "sheet_name"),
  };
}

/**
 * Extract sample data rows for preview
 */
function extractSampleData(
  data: (string | number)[][],
  headerRow: number,
  count: number
): Record<string, unknown>[] {
  const headers = data[headerRow];
  if (!headers) return [];

  const samples: Record<string, unknown>[] = [];

  for (let i = headerRow + 1; i < Math.min(headerRow + 1 + count, data.length); i++) {
    const row = data[i];
    if (!row || row.every((c) => !c)) continue;

    const record: Record<string, unknown> = {};
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = String(headers[colIdx] || `col_${colIdx}`);
      record[header] = row[colIdx];
    }
    samples.push(record);
  }

  return samples;
}
