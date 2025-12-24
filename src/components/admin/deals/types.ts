export type DealFilterState = {
  search: string;
  manufacturers: string[];
  providers: string[];
  fuelTypes: string[];
  bodyStyles: string[];
  minPrice: number | null;
  maxPrice: number | null;
  scoreMin: number;
  tab: "contract-hire" | "personal-contract-hire";
  withMaintenance: boolean;
};

export type DealCard = {
  vehicleId: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  capCode: string | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  co2Gkm: number | null;
  p11dGbp: number | null;
  imageUrl: string | null;
  score: number;
  bestDeal: {
    providerCode: string;
    providerName: string;
    contractType: string;
    term: number;
    annualMileage: number;
    paymentPlan: string;
    monthlyRentalGbp: number;
  };
  providerMiniGrid: Array<{
    providerCode: string;
    providerName: string;
    monthlyRentalGbp: number | null;
    isBest: boolean;
  }>;
};

export type DealFilterOptions = {
  manufacturers: string[];
  fuelTypes: string[];
  bodyStyles: string[];
};

export type DealsResponse = {
  deals: DealCard[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filterOptions: DealFilterOptions;
};

export type HeatmapConfig = {
  rowMode: "vehicles" | "make-model";
  columnMode: "providers" | "contract-types";
  metric: "best-price" | "price-range" | "rate-count";
};

export type HeatmapRow = {
  id: string;
  label: string;
  subLabel?: string | null;
};

export type HeatmapColumn = {
  id: string;
  label: string;
};

export type HeatmapCell = {
  rowId: string;
  columnId: string;
  value: number | null;
  min?: number | null;
  max?: number | null;
  count?: number | null;
};

export type DealsHeatmapResponse = {
  rows: HeatmapRow[];
  columns: HeatmapColumn[];
  cells: HeatmapCell[];
  metric: HeatmapConfig["metric"];
};
