"use client";

import { useState, useEffect, useCallback } from "react";
import { ContractTabs } from "./contract-tabs";
import { RatesFilters } from "./rates-filters";
import { RatesTable } from "./rates-table";
import type {
  ContractTab,
  RatesFilterState,
  FilterOptions,
  BrowseRate,
  Pagination,
  SortState,
} from "@/lib/rates/types";
import { DEFAULT_FILTER_STATE } from "@/lib/rates/types";

export function RatesBrowser() {
  const [filters, setFilters] = useState<RatesFilterState>(DEFAULT_FILTER_STATE);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [rates, setRates] = useState<BrowseRate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [sort, setSort] = useState<SortState>({ field: "totalRentalGbp", order: "asc" });
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    setIsLoadingFilters(true);
    try {
      const params = new URLSearchParams({
        tab: filters.tab,
        withMaintenance: String(filters.withMaintenance),
      });
      if (filters.manufacturers.length > 0) {
        params.set("manufacturers", filters.manufacturers.join(","));
      }
      const res = await fetch(`/api/admin/rates/filters?${params}`);
      const data = await res.json();
      if (data.options) {
        setFilterOptions(data.options);
      }
    } catch (err) {
      console.error("Error fetching filter options:", err);
    } finally {
      setIsLoadingFilters(false);
    }
  }, [filters.tab, filters.withMaintenance, filters.manufacturers]);

  // Fetch rates
  const fetchRates = useCallback(async (page = 1) => {
    setIsLoadingRates(true);
    try {
      const params = new URLSearchParams({
        tab: filters.tab,
        withMaintenance: String(filters.withMaintenance),
        vehicleCategory: filters.vehicleCategory,
        page: String(page),
        pageSize: "50",
        sort: sort.field === "totalRentalGbp" ? "totalRental"
            : sort.field === "p11dGbp" ? "p11d"
            : sort.field,
        order: sort.order,
      });

      // Provider filter
      if (filters.providers.length > 0) {
        params.set("providers", filters.providers.join(","));
      }

      if (filters.manufacturers.length > 0) {
        params.set("manufacturers", filters.manufacturers.join(","));
      }
      if (filters.models.length > 0) {
        params.set("models", filters.models.join(","));
      }
      if (filters.fuelTypes.length > 0) {
        params.set("fuelTypes", filters.fuelTypes.join(","));
      }
      if (filters.bodyTypes.length > 0) {
        params.set("bodyTypes", filters.bodyTypes.join(","));
      }
      if (filters.terms.length > 0) {
        params.set("terms", filters.terms.join(","));
      }
      if (filters.mileages.length > 0) {
        params.set("mileages", filters.mileages.join(","));
      }
      if (filters.priceRange.min !== null) {
        params.set("minPrice", String(filters.priceRange.min));
      }
      if (filters.priceRange.max !== null) {
        params.set("maxPrice", String(filters.priceRange.max));
      }
      if (filters.insuranceGroupRange.min !== null) {
        params.set("minInsurance", String(filters.insuranceGroupRange.min));
      }
      if (filters.insuranceGroupRange.max !== null) {
        params.set("maxInsurance", String(filters.insuranceGroupRange.max));
      }
      if (filters.co2Range.min !== null) {
        params.set("minCo2", String(filters.co2Range.min));
      }
      if (filters.co2Range.max !== null) {
        params.set("maxCo2", String(filters.co2Range.max));
      }
      if (filters.evRangeMin !== null) {
        params.set("minEvRange", String(filters.evRangeMin));
      }
      if (filters.p11dRange.min !== null) {
        params.set("minP11d", String(filters.p11dRange.min));
      }
      if (filters.p11dRange.max !== null) {
        params.set("maxP11d", String(filters.p11dRange.max));
      }

      const res = await fetch(`/api/admin/rates?${params}`);
      const data = await res.json();
      if (data.rates) {
        setRates(data.rates);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Error fetching rates:", err);
    } finally {
      setIsLoadingRates(false);
    }
  }, [filters, sort]);

  // Initial load and reload on tab/maintenance change
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Reload rates when filters or sort change
  useEffect(() => {
    fetchRates(1);
  }, [filters, sort]);

  const handleTabChange = (tab: ContractTab) => {
    setFilters((prev) => ({
      ...DEFAULT_FILTER_STATE,
      tab,
      withMaintenance: tab === "salary-sacrifice" ? true : prev.withMaintenance,
    }));
  };

  const handleMaintenanceChange = (withMaintenance: boolean) => {
    setFilters((prev) => ({ ...prev, withMaintenance }));
  };

  const handleFilterChange = (updates: Partial<RatesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...DEFAULT_FILTER_STATE,
      tab: prev.tab,
      withMaintenance: prev.withMaintenance,
      vehicleCategory: prev.vehicleCategory, // Preserve vehicle category
      providers: [], // Reset providers
    }));
  };

  const handleSortChange = (newSort: SortState) => {
    setSort(newSort);
  };

  const handlePageChange = (page: number) => {
    fetchRates(page);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(30, 141, 141, 0.2) 0%, rgba(121, 213, 233, 0.1) 100%)",
              border: "1px solid rgba(121, 213, 233, 0.2)",
            }}
          >
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Rates Browser</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {pagination.total.toLocaleString()} rates from {filterOptions?.manufacturers.length || 0} manufacturers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
              ${showFilters
                ? "text-cyan-400 bg-cyan-500/10"
                : "text-white/50 hover:text-white/70 hover:bg-white/5"
              }
            `}
            style={{
              border: `1px solid ${showFilters ? "rgba(121, 213, 233, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
            }}
            aria-expanded={showFilters}
            aria-controls="filters-panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Tabs and Maintenance Toggle */}
      <ContractTabs
        activeTab={filters.tab}
        withMaintenance={filters.withMaintenance}
        onTabChange={handleTabChange}
        onMaintenanceChange={handleMaintenanceChange}
      />

      {/* Filters Panel */}
      {showFilters && (
        <div id="filters-panel">
          <RatesFilters
            filters={filters}
            options={filterOptions}
            onChange={handleFilterChange}
            onClearAll={handleClearFilters}
            isLoading={isLoadingFilters}
          />
        </div>
      )}

      {/* Rates Table */}
      <RatesTable
        rates={rates}
        pagination={pagination}
        isLoading={isLoadingRates}
        sort={sort}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
      />

    </div>
  );
}
