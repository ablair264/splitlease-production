/**
 * Smart Import System
 *
 * Intelligent ratebook importer that auto-detects format and uses
 * the appropriate parser:
 * - Tabular: Column-based format with one rate per row
 * - Matrix: Grid layout with payment profiles × mileage bands
 */

export * from "./types";
export { detectFormat } from "./format-detector";
export { parseMatrixWorkbook } from "./matrix-parser";
export { smartImport, analyzeFile } from "./smart-importer";
