// Contract type groupings for tabs
export type ContractTab = "contract-hire" | "personal-contract-hire" | "salary-sacrifice";

export const TAB_CONTRACT_TYPES: Record<ContractTab, string[]> = {
  "contract-hire": ["CH", "CHNM"],
  "personal-contract-hire": ["PCH", "PCHNM"],
  "salary-sacrifice": ["BSSNL"],
};

export const TAB_LABELS: Record<ContractTab, string> = {
  "contract-hire": "Contract Hire",
  "personal-contract-hire": "Personal Contract Hire",
  "salary-sacrifice": "Salary Sacrifice",
};

// Whether tab supports maintenance toggle
export const TAB_HAS_MAINTENANCE_TOGGLE: Record<ContractTab, boolean> = {
  "contract-hire": true,
  "personal-contract-hire": true,
  "salary-sacrifice": false, // BSSNL always includes maintenance
};

// Vehicle category for Cars vs Vans toggle
export type VehicleCategory = "cars" | "vans" | "all";

// Body types classified as vans
export const VAN_BODY_TYPES = [
  "Van", "Panel Van", "Crew Van", "Chassis Cab", "Dropside",
  "Tipper", "Luton", "Box Van", "Minibus", "Campervan", "Pickup"
];

// Filter state interface
export interface RatesFilterState {
  tab: ContractTab;
  withMaintenance: boolean;
  vehicleCategory: VehicleCategory;
  providers: string[];
  manufacturers: string[];
  models: string[];
  fuelTypes: string[];
  bodyTypes: string[];
  terms: number[];
  mileages: number[];
  priceRange: { min: number | null; max: number | null };
  insuranceGroupRange: { min: number | null; max: number | null };
  co2Range: { min: number | null; max: number | null };
  evRangeMin: number | null;
  p11dRange: { min: number | null; max: number | null };
}

// Available providers
export const PROVIDER_OPTIONS = [
  { code: "lex", label: "Lex Autolease" },
  { code: "ogilvie", label: "Ogilvie Fleet" },
];

// Default filter state
export const DEFAULT_FILTER_STATE: RatesFilterState = {
  tab: "contract-hire",
  withMaintenance: false, // Default to without maintenance to show all providers including Ogilvie
  vehicleCategory: "cars", // Default to cars only
  providers: [], // Empty = all providers
  manufacturers: [],
  models: [],
  fuelTypes: [],
  bodyTypes: [],
  terms: [],
  mileages: [],
  priceRange: { min: null, max: null },
  insuranceGroupRange: { min: null, max: null },
  co2Range: { min: null, max: null },
  evRangeMin: null,
  p11dRange: { min: null, max: null },
};

// Score breakdown for composite scoring
export interface ScoreBreakdown {
  valueScore: number;
  efficiencyBonus: number;
  affordabilityMod: number;
  brandBonus: number;
  costRatio: number;
  totalPayments: number;
}

// API response rate type
export interface BrowseRate {
  id: string;
  capCode: string | null;
  providerCode: string;
  contractType: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  term: number;
  annualMileage: number;
  paymentPlan: string;
  totalRentalGbp: number;
  leaseRentalGbp: number | null;
  serviceRentalGbp: number | null;
  co2Gkm: number | null;
  p11dGbp: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  insuranceGroup: string | null;
  evRangeMiles: number | null;
  excessMileagePence: number | null;
  bikTaxLowerRateGbp: number | null;
  bikTaxHigherRateGbp: number | null;
  // Value scoring
  valueScore: number;
  valueLabel: string;
  scoreBreakdown: ScoreBreakdown | null;
  costRatio: number | null;
}

// Filter options from API
export interface FilterOptions {
  manufacturers: string[];
  models: { manufacturer: string; model: string }[];
  fuelTypes: string[];
  bodyTypes: string[];
  terms: number[];
  mileages: number[];
  priceRange: { min: number; max: number };
  insuranceGroups: string[];
  co2Range: { min: number; max: number };
  evRangeMax: number;
  p11dRange: { min: number; max: number };
}

// Pagination
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// API response type
export interface RatesApiResponse {
  rates: BrowseRate[];
  pagination: Pagination;
  appliedFilters: Partial<RatesFilterState>;
}

export interface FilterOptionsApiResponse {
  options: FilterOptions;
}

// Sort options
export type SortField =
  | "totalRentalGbp"
  | "manufacturer"
  | "model"
  | "co2Gkm"
  | "p11dGbp"
  | "term"
  | "annualMileage";

export type SortOrder = "asc" | "desc";

export interface SortState {
  field: SortField;
  order: SortOrder;
}

// Price band options for filter
export const PRICE_BANDS = [
  { label: "Under £200", min: 0, max: 200 },
  { label: "£200 - £300", min: 200, max: 300 },
  { label: "£300 - £400", min: 300, max: 400 },
  { label: "£400 - £500", min: 400, max: 500 },
  { label: "£500 - £750", min: 500, max: 750 },
  { label: "£750 - £1000", min: 750, max: 1000 },
  { label: "Over £1000", min: 1000, max: null },
];

// Common term options
export const TERM_OPTIONS = [24, 36, 48, 60];

// Common mileage options
export const MILEAGE_OPTIONS = [5000, 8000, 10000, 15000, 20000, 30000];

// Fuel type options
export const FUEL_TYPE_OPTIONS = [
  "Electric",
  "Petrol",
  "Diesel",
  "Petrol (Mild Hybrid)",
  "Diesel (Mild Hybrid)",
  "Petrol (Plug-in Hybrid)",
  "Diesel (Plug-in Hybrid)",
  "Hybrid",
];

// Helper to get contract types for current filter state
export function getContractTypesForFilters(tab: ContractTab, withMaintenance: boolean): string[] {
  if (tab === "salary-sacrifice") {
    return ["BSSNL"]; // Always with maintenance
  }

  if (tab === "contract-hire") {
    return withMaintenance ? ["CH"] : ["CHNM"];
  }

  if (tab === "personal-contract-hire") {
    return withMaintenance ? ["PCH"] : ["PCHNM"];
  }

  return [];
}

// Helper to format currency
export function formatGbp(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to format mileage
export function formatMileage(value: number): string {
  return `${value.toLocaleString("en-GB")} mi`;
}

// Helper to format term
export function formatTerm(value: number): string {
  return `${value} mo`;
}
