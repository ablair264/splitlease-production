"use client";

export interface ScoreBreakdown {
  valueScore: number;
  efficiencyBonus: number;
  affordabilityMod: number;
  brandBonus: number;
  costRatio: number;
  totalPayments: number;
}

export interface TermsHolderOtr {
  providerOtr: number; // Provider's OTR in GBP
  termsOtr: number; // Terms holder OTR in GBP
  savingsGbp: number; // Potential savings in GBP
  savingsPercent: number; // Savings as percentage
}

export type MarketPosition = "lowest" | "below-avg" | "average" | "above-avg" | "highest";

export interface MarketPositionData {
  position: MarketPosition;
  percentile: number; // 0-100, lower is better
  priceDeltaPercent: number; // negative = we're cheaper
  competitorCount: number;
}

export interface VehicleTableRow {
  id: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  fuelType: string;
  p11dGbp: number;
  bestFunder: {
    code: string;
    name: string;
    priceGbp: number;
  };
  providerCount: number;
  providers: string[];
  latestRateDate: string | null;
  integrityDays: number;
  bestScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  isSpecialOffer: boolean;
  isEnabled: boolean;
  logoUrl: string;
  rateCount: number;
  termsHolderOtr: TermsHolderOtr | null; // Opportunity for better rate with terms holder OTR
  marketPosition: MarketPositionData | null; // Position vs competitor pricing
}

export interface FilterOptions {
  manufacturers: string[];
  fuelTypes: string[];
  providers: { code: string; name: string }[];
  priceRange: { min: number; max: number };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export type VehicleCategory = "cars" | "vans" | "all";

export interface TableFilters {
  search: string;
  manufacturers: string[];
  fuelTypes: string[];
  priceMin: number | null;
  priceMax: number | null;
  scoreMin: number;
  scoreMax: number;
  ageMax: number | null;
  specialOfferOnly: boolean;
  enabledOnly: boolean;
  vehicleCategory: VehicleCategory;
}

export interface SortState {
  field: string;
  order: "asc" | "desc";
}

export interface UserView {
  id: string;
  viewName: string;
  tableId: string;
  columnOrder: string[] | null;
  columnVisibility: Record<string, boolean> | null;
  columnWidths: Record<string, number> | null;
  filters: Record<string, unknown> | null;
  sortBy: string | null;
  sortOrder: string | null;
  isDefault: boolean;
}
