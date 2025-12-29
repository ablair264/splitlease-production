/**
 * Smart Import Types
 *
 * Handles two distinct ratebook formats:
 * 1. Tabular - column headers with one rate per row (ALD, Venus standard)
 * 2. Matrix - grid layout with payment profiles × mileage bands (dealer matrices)
 */

export type RatebookFormat = "tabular" | "matrix" | "unknown";

export type ContractType = "BCH" | "PCH" | "BSSNL" | "CH" | "CHNM" | "PCHNM";

export interface DetectionResult {
  format: RatebookFormat;
  confidence: number; // 0-100
  reason: string;
  sheets: SheetAnalysis[];
}

export interface SheetAnalysis {
  name: string;
  format: RatebookFormat;
  headerRow?: number;
  columns?: ColumnMapping[];
  matrixInfo?: MatrixInfo;
  vehicleInfo?: ExtractedVehicleInfo;
  sampleData?: Record<string, unknown>[];
}

export interface ColumnMapping {
  sourceColumn: number;
  sourceHeader: string;
  targetField: string | null;
  confidence: number;
}

export interface MatrixInfo {
  // Where the matrix data starts
  dataStartRow: number;
  dataStartCol: number;

  // What the rows represent
  rowType: "payment_profile" | "mileage" | "unknown";
  rowLabels: string[];

  // What the columns represent
  colType: "mileage" | "payment_profile" | "maintenance_split" | "unknown";
  colLabels: string[];

  // Sub-columns (e.g., Maint / Non-Maint under each mileage)
  hasSubColumns: boolean;
  subColumnLabels?: string[];

  // Contract type sections (some sheets have BCH and HCH sections)
  sections?: MatrixSection[];
}

export interface MatrixSection {
  contractType: ContractType;
  startRow: number;
  endRow: number;
}

export interface ExtractedVehicleInfo {
  manufacturer?: string;
  model?: string;
  variant?: string;
  capCode?: string;
  capId?: string;
  quoteNumber?: string;
  otr?: number;
  source: "sheet_name" | "header_cells" | "both";
}

export interface ParsedRate {
  capCode?: string;
  capId?: string;
  manufacturer: string;
  model: string;
  variant?: string;
  term: number;
  annualMileage: number;
  initialMonths: number;
  paymentProfile: string; // e.g., "3+35"
  contractType: ContractType;
  monthlyRental: number; // in pence
  isMaintained: boolean;
  otr?: number;
  p11d?: number;
  co2?: number;
  fuelType?: string;
  transmission?: string;
  quoteNumber?: string;
  sourceSheet: string;
  sourceRow: number;
  sourceCol: number;
}

export interface SmartImportResult {
  success: boolean;
  format: RatebookFormat;
  totalSheets: number;
  processedSheets: number;
  totalRates: number;
  successRates: number;
  errorRates: number;
  rates: ParsedRate[];
  errors: string[];
  warnings: string[];
}

export interface SmartImportOptions {
  fileName: string;
  fileContent: Buffer | string;
  providerCode: string;
  contractType?: ContractType; // Override if known
  userId?: string;
  dryRun?: boolean; // Parse only, don't save to DB
  columnMappings?: Record<number, string>; // Custom column mappings: sourceColumn -> targetField
}

// Common payment profile patterns
export const PAYMENT_PROFILES = [
  "1+11", "1+17", "1+23", "1+35", "1+47", "1+59",
  "3+9", "3+21", "3+33", "3+45", "3+57",
  "6+6", "6+18", "6+30", "6+42", "6+54",
  "9+3", "9+15", "9+27", "9+39", "9+51",
  "12+12", "12+24", "12+36", "12+48"
] as const;

// Common mileage bands
export const MILEAGE_BANDS = [
  5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000
] as const;

// Known column header patterns for tabular format
export const TABULAR_HEADER_PATTERNS: Record<string, string[]> = {
  capCode: ["cap_code", "capcode", "cap code", "cap-code", "lookup_code", "lookupcode"],
  capId: ["cap_id", "capid", "cap id", "cap-id", "dataoriginatorcode"],
  manufacturer: ["manufacturer", "make", "brand", "oem"],
  model: ["model", "model_name", "modelname", "range"],
  variant: ["variant", "derivative", "vehicle description", "vehicledescription", "trim"],
  term: ["term", "contract_term", "contractterm", "months", "duration"],
  annualMileage: ["annual_mileage", "annualmileage", "mileage", "miles", "annual miles"],
  monthlyRental: ["rental", "monthly", "net_rental", "netrental", "monthly_rental", "price", "rate"],
  otr: ["otr", "on_the_road", "ontheroad", "otR"],
  p11d: ["p11d", "p11_d", "list_price", "listprice"],
  co2: ["co2", "co2_g_per_km", "emissions", "co2gkm"],
  fuelType: ["fuel", "fuel_type", "fueltype", "fuel type"],
  transmission: ["transmission", "trans", "gearbox"],
};
