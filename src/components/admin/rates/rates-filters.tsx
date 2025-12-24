"use client";

import { useState } from "react";
import { FilterDropdown } from "./filter-dropdown";
import { RangeFilter } from "./range-filter";
import { ChipSelect } from "./chip-select";
import type { RatesFilterState, FilterOptions, VehicleCategory } from "@/lib/rates/types";
import { TERM_OPTIONS, MILEAGE_OPTIONS, FUEL_TYPE_OPTIONS, PROVIDER_OPTIONS } from "@/lib/rates/types";

interface RatesFiltersProps {
  filters: RatesFilterState;
  options: FilterOptions | null;
  onChange: (filters: Partial<RatesFilterState>) => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

export function RatesFilters({
  filters,
  options,
  onChange,
  onClearAll,
  isLoading,
}: RatesFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    filters.vehicleCategory !== "cars" ||
    filters.providers.length > 0 ||
    filters.manufacturers.length > 0 ||
    filters.models.length > 0 ||
    filters.fuelTypes.length > 0 ||
    filters.bodyTypes.length > 0 ||
    filters.terms.length > 0 ||
    filters.mileages.length > 0 ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.insuranceGroupRange.min !== null ||
    filters.insuranceGroupRange.max !== null ||
    filters.co2Range.min !== null ||
    filters.co2Range.max !== null ||
    filters.evRangeMin !== null ||
    filters.p11dRange.min !== null ||
    filters.p11dRange.max !== null;

  const hasAdvancedFilters =
    filters.insuranceGroupRange.min !== null ||
    filters.insuranceGroupRange.max !== null ||
    filters.co2Range.min !== null ||
    filters.co2Range.max !== null ||
    filters.evRangeMin !== null ||
    filters.p11dRange.min !== null ||
    filters.p11dRange.max !== null;

  // Get models filtered by selected manufacturers
  const availableModels = options?.models
    .filter((m) =>
      filters.manufacturers.length === 0 ||
      filters.manufacturers.some(
        (mfr) => mfr.toUpperCase() === m.manufacturer.toUpperCase()
      )
    )
    .map((m) => m.model) || [];

  // Count active filters for badge
  const activeFilterCount =
    (filters.vehicleCategory !== "cars" ? 1 : 0) +
    filters.providers.length +
    filters.manufacturers.length +
    filters.models.length +
    filters.fuelTypes.length +
    filters.bodyTypes.length +
    filters.terms.length +
    filters.mileages.length +
    (filters.priceRange.min !== null || filters.priceRange.max !== null ? 1 : 0) +
    (filters.insuranceGroupRange.min !== null || filters.insuranceGroupRange.max !== null ? 1 : 0) +
    (filters.co2Range.min !== null || filters.co2Range.max !== null ? 1 : 0) +
    (filters.evRangeMin !== null ? 1 : 0) +
    (filters.p11dRange.min !== null || filters.p11dRange.max !== null ? 1 : 0);

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
            <span className="text-sm text-white/60">Loading filters...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Quick Filters - Always Visible */}
      <div className="p-4 space-y-4">
        {/* Top row: Vehicle Category Toggle + Provider Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Vehicle Category Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-medium">Show:</span>
            <div
              className="inline-flex rounded-lg p-0.5"
              style={{ background: "rgba(15, 20, 25, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              {(["cars", "vans", "all"] as VehicleCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => onChange({ vehicleCategory: cat })}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${filters.vehicleCategory === cat
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                    }
                  `}
                >
                  {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-medium">Provider:</span>
            <div
              className="inline-flex rounded-lg p-0.5"
              style={{ background: "rgba(15, 20, 25, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              <button
                onClick={() => onChange({ providers: [] })}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-all
                  ${filters.providers.length === 0
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }
                `}
              >
                All
              </button>
              {PROVIDER_OPTIONS.map((provider) => (
                <button
                  key={provider.code}
                  onClick={() => {
                    const isSelected = filters.providers.includes(provider.code);
                    if (isSelected) {
                      onChange({ providers: filters.providers.filter((p) => p !== provider.code) });
                    } else {
                      onChange({ providers: [...filters.providers, provider.code] });
                    }
                  }}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${filters.providers.includes(provider.code)
                      ? provider.code === "lex"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                    }
                  `}
                >
                  {provider.code === "lex" ? "Lex" : "Ogilvie"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Term & Mileage - Most common filters inline */}
        <div className="flex flex-wrap items-start gap-6">
          <ChipSelect
            label="Term"
            options={options?.terms || TERM_OPTIONS}
            selected={filters.terms}
            onChange={(v) => onChange({ terms: v })}
            formatLabel={(v) => `${v}mo`}
            compact
          />
          <div className="h-8 w-px bg-white/10 hidden sm:block self-end mb-1" />
          <ChipSelect
            label="Mileage"
            options={options?.mileages || MILEAGE_OPTIONS}
            selected={filters.mileages}
            onChange={(v) => onChange({ mileages: v })}
            formatLabel={(v) => `${(v / 1000).toFixed(0)}k`}
            compact
          />
          <div className="h-8 w-px bg-white/10 hidden lg:block self-end mb-1" />
          {/* Monthly price range inline */}
          <div className="flex-shrink-0">
            <RangeFilter
              label="Monthly"
              minValue={filters.priceRange.min}
              maxValue={filters.priceRange.max}
              minLimit={0}
              maxLimit={options?.priceRange.max || 5000}
              onChange={(min, max) => onChange({ priceRange: { min, max } })}
              prefix="£"
              step={50}
              compact
            />
          </div>
        </div>

        {/* Vehicle Selection Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterDropdown
            label="Make"
            options={options?.manufacturers || []}
            selected={filters.manufacturers}
            onChange={(v) => onChange({ manufacturers: v, models: [] })}
            placeholder="All makes"
          />
          <FilterDropdown
            label="Model"
            options={Array.from(new Set(availableModels))}
            selected={filters.models}
            onChange={(v) => onChange({ models: v })}
            placeholder="All models"
            disabled={filters.manufacturers.length === 0}
          />
          <FilterDropdown
            label="Fuel"
            options={options?.fuelTypes || FUEL_TYPE_OPTIONS}
            selected={filters.fuelTypes}
            onChange={(v) => onChange({ fuelTypes: v })}
            placeholder="All fuels"
            searchable={false}
          />
          <FilterDropdown
            label="Body"
            options={options?.bodyTypes || []}
            selected={filters.bodyTypes}
            onChange={(v) => onChange({ bodyTypes: v })}
            placeholder="All bodies"
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              flex items-center gap-2 text-xs font-medium transition-colors
              ${showAdvanced || hasAdvancedFilters ? "text-cyan-400" : "text-white/50 hover:text-white/70"}
            `}
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced filters
            {hasAdvancedFilters && !showAdvanced && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>

          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <span className="text-xs text-white/40">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${showAdvanced ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
        `}
      >
        <div
          className="p-4 pt-0 space-y-4"
          style={{ borderTop: showAdvanced ? "1px solid rgba(255, 255, 255, 0.05)" : "none" }}
        >
          <div className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RangeFilter
              label="P11D Value"
              minValue={filters.p11dRange.min}
              maxValue={filters.p11dRange.max}
              minLimit={0}
              maxLimit={options?.p11dRange.max || 200000}
              onChange={(min, max) => onChange({ p11dRange: { min, max } })}
              prefix="£"
              step={1000}
            />
            <RangeFilter
              label="CO2 (g/km)"
              minValue={filters.co2Range.min}
              maxValue={filters.co2Range.max}
              minLimit={0}
              maxLimit={options?.co2Range.max || 300}
              onChange={(min, max) => onChange({ co2Range: { min, max } })}
              step={10}
            />
            <RangeFilter
              label="Insurance Group"
              minValue={filters.insuranceGroupRange.min}
              maxValue={filters.insuranceGroupRange.max}
              minLimit={1}
              maxLimit={50}
              onChange={(min, max) => onChange({ insuranceGroupRange: { min, max } })}
              step={1}
            />
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Min EV Range</label>
              <div className="relative">
                <input
                  type="number"
                  value={filters.evRangeMin ?? ""}
                  onChange={(e) =>
                    onChange({
                      evRangeMin: e.target.value === "" ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="Min miles"
                  min={0}
                  max={options?.evRangeMax || 500}
                  step={10}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-cyan-500/30"
                  style={{
                    background: "rgba(15, 20, 25, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                />
                {filters.evRangeMin !== null && (
                  <button
                    onClick={() => onChange({ evRangeMin: null })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
