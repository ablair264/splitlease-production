"use client";

import { useState } from "react";
import { X, RotateCcw } from "lucide-react";
import type { TableFilters, FilterOptions } from "./types";

interface FilterBuilderProps {
  filters: TableFilters;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: TableFilters) => void;
  onClose: () => void;
}

export function FilterBuilder({
  filters,
  filterOptions,
  onFiltersChange,
  onClose,
}: FilterBuilderProps) {
  // Reset all filters
  const handleReset = () => {
    onFiltersChange({
      search: "",
      manufacturers: [],
      fuelTypes: [],
      priceMin: null,
      priceMax: null,
      scoreMin: 0,
      scoreMax: 100,
      ageMax: null,
      specialOfferOnly: false,
      enabledOnly: true,
    });
  };

  // Toggle manufacturer filter
  const toggleManufacturer = (manufacturer: string) => {
    const current = filters.manufacturers;
    const updated = current.includes(manufacturer)
      ? current.filter((m) => m !== manufacturer)
      : [...current, manufacturer];
    onFiltersChange({ ...filters, manufacturers: updated });
  };

  // Toggle fuel type filter
  const toggleFuelType = (fuelType: string) => {
    const current = filters.fuelTypes;
    const updated = current.includes(fuelType)
      ? current.filter((f) => f !== fuelType)
      : [...current, fuelType];
    onFiltersChange({ ...filters, fuelTypes: updated });
  };

  return (
    <div
      className="mb-4 p-4 rounded-lg"
      style={{
        background: "rgba(26, 31, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Filter Vehicles</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-white/50 hover:text-white/70"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Price Range */}
        <div>
          <label className="block text-xs text-white/50 mb-2">Price Range (monthly)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceMin: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50"
            />
            <span className="text-white/40">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  priceMax: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Score Range */}
        <div>
          <label className="block text-xs text-white/50 mb-2">Score Range</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              min={0}
              max={100}
              value={filters.scoreMin}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  scoreMin: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50"
            />
            <span className="text-white/40">-</span>
            <input
              type="number"
              placeholder="Max"
              min={0}
              max={100}
              value={filters.scoreMax}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  scoreMax: parseInt(e.target.value) || 100,
                })
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Rate Age */}
        <div>
          <label className="block text-xs text-white/50 mb-2">Max Rate Age (days)</label>
          <input
            type="number"
            placeholder="Any"
            value={filters.ageMax ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                ageMax: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/40
              bg-white/5 border border-white/10
              focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Toggle filters */}
        <div>
          <label className="block text-xs text-white/50 mb-2">Options</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.specialOfferOnly}
                onChange={(e) =>
                  onFiltersChange({ ...filters, specialOfferOnly: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/30 bg-transparent text-cyan-500
                  focus:ring-cyan-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-white/70">Special offers only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.enabledOnly}
                onChange={(e) =>
                  onFiltersChange({ ...filters, enabledOnly: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/30 bg-transparent text-cyan-500
                  focus:ring-cyan-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-white/70">Enabled only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Manufacturer chips */}
      <div className="mt-4">
        <label className="block text-xs text-white/50 mb-2">Manufacturers</label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto admin-scrollbar">
          {filterOptions.manufacturers.map((manufacturer) => {
            const isSelected = filters.manufacturers.includes(manufacturer);
            return (
              <button
                key={manufacturer}
                onClick={() => toggleManufacturer(manufacturer)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                  ${isSelected
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }
                `}
              >
                {manufacturer}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fuel type chips */}
      <div className="mt-4">
        <label className="block text-xs text-white/50 mb-2">Fuel Types</label>
        <div className="flex flex-wrap gap-2">
          {filterOptions.fuelTypes.map((fuelType) => {
            const isSelected = filters.fuelTypes.includes(fuelType);
            return (
              <button
                key={fuelType}
                onClick={() => toggleFuelType(fuelType)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                  ${isSelected
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }
                `}
              >
                {fuelType}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
