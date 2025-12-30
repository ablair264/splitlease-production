"use client";

import { useState } from "react";
import {
  Filter,
  SlidersHorizontal,
  Download,
  ChevronDown,
  Search,
  X,
  Eye,
  MoreVertical,
} from "lucide-react";
import type { TableFilters, FilterOptions, VehicleCategory, SortState } from "./types";
import type { VisibilityState, ColumnOrderState } from "@tanstack/react-table";
import { FilterBuilder } from "./FilterBuilder";
import { ViewManager } from "./ViewManager";
import { ViewSelector } from "./ViewSelector";

interface RateExplorerToolbarProps {
  filters: TableFilters;
  filterOptions: FilterOptions;
  onFiltersChange: (filters: TableFilters) => void;
  selectedCount: number;
  totalCount: number;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onExport: (format: "csv" | "xlsx") => void;
  showMaintenance: boolean;
  onShowMaintenanceChange: (show: boolean) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onApplyView: (view: {
    columnOrder: ColumnOrderState;
    columnVisibility: VisibilityState;
    filters: TableFilters;
    sort: SortState;
  }) => void;
}

export function RateExplorerToolbar({
  filters,
  filterOptions,
  onFiltersChange,
  selectedCount,
  totalCount,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  onExport,
  showMaintenance,
  onShowMaintenanceChange,
  sort,
  onSortChange,
  onApplyView,
}: RateExplorerToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showViewManager, setShowViewManager] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [viewRefreshTrigger, setViewRefreshTrigger] = useState(0);

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.manufacturers.length > 0,
    filters.fuelTypes.length > 0,
    filters.priceMin !== null,
    filters.priceMax !== null,
    filters.scoreMin > 0,
    filters.scoreMax < 100,
    filters.ageMax !== null,
    filters.specialOfferOnly,
    !filters.enabledOnly,
    filters.vehicleCategory !== "cars", // Count if not default
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const clearSearch = () => {
    onFiltersChange({ ...filters, search: "" });
  };

  return (
    <>
      <div
        className="flex items-center justify-between gap-4 px-4 py-3 mb-4 rounded-lg"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search vehicles..."
              className="w-64 pl-9 pr-8 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30
                transition-all duration-200"
            />
            {filters.search && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${showFilters || activeFilterCount > 0
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }
            `}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full"
                style={{ background: "#79d5e9", color: "#0f1419" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Vehicle category toggle */}
          <div className="flex items-center rounded-lg bg-white/5 border border-white/10 overflow-hidden">
            {(["cars", "vans", "all"] as VehicleCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => onFiltersChange({ ...filters, vehicleCategory: cat })}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filters.vehicleCategory === cat
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Maintenance toggle */}
          <div className="flex items-center rounded-lg bg-white/5 border border-white/10 overflow-hidden">
            <button
              onClick={() => onShowMaintenanceChange(false)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                !showMaintenance
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Excl. Maint
            </button>
            <button
              onClick={() => onShowMaintenanceChange(true)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                showMaintenance
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              Incl. Maint
            </button>
          </div>

          {/* Selected count */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-sm text-cyan-400 font-medium">
                {selectedCount} selected
              </span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Saved views selector */}
          <ViewSelector
            onApplyView={onApplyView}
            refreshTrigger={viewRefreshTrigger}
          />

          {/* View button */}
          <button
            onClick={() => setShowViewManager(!showViewManager)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${showViewManager
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }
            `}
          >
            <Eye className="w-4 h-4" />
            <span>Columns</span>
          </button>

          {/* Export menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 p-2 rounded-lg text-white/70
                bg-white/5 border border-white/10 hover:bg-white/10
                transition-all duration-200"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg shadow-xl z-50"
                  style={{
                    background: "rgba(26, 31, 42, 0.98)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <button
                    onClick={() => {
                      onExport("csv");
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      onExport("xlsx");
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
                  >
                    <Download className="w-4 h-4" />
                    Export XLSX
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-white/50">
            <span className="text-white/70 font-medium">{totalCount.toLocaleString()}</span> results
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <FilterBuilder
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={onFiltersChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* View manager panel */}
      {showViewManager && (
        <ViewManager
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
          columnOrder={columnOrder}
          onColumnOrderChange={onColumnOrderChange}
          onClose={() => setShowViewManager(false)}
          filters={filters}
          sort={sort}
          onViewSaved={() => setViewRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </>
  );
}
