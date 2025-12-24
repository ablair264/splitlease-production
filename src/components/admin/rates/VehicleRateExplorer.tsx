"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { VehicleListItem } from "./VehicleListItem";
import { VehicleDetailPanel } from "./VehicleDetailPanel";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  capCode: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  co2: number | null;
  p11d: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  rateCount: number;
  avgValueScore: number | null;
  minMonthlyRental: number | null;
  maxMonthlyRental: number | null;
  hasOgilvieRates: boolean;
  hasLexRates: boolean;
  hasVenusRates: boolean;
  hasFleetDiscount: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface Filters {
  search: string;
  manufacturers: string[];
  models: string[];
  funders: string[];
  fuelTypes: string[];
  scoreRange: string;
  hasRates: boolean;
  vehicleCategory: "cars" | "vans";
}

const FUNDERS = [
  { code: "lex", name: "Lex" },
  { code: "ogilvie", name: "Ogilvie" },
  { code: "venus", name: "Venus" },
];

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "PHEV"];
const SCORE_RANGES = [
  { value: "", label: "All Scores" },
  { value: "80-100", label: "80+ (Hot Deals)" },
  { value: "60-79", label: "60-79 (Great)" },
  { value: "40-59", label: "40-59 (Good)" },
  { value: "0-39", label: "Under 40" },
];

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm min-w-[160px]",
          "bg-[#1a1f2a] border border-gray-700 text-white",
          "hover:border-gray-600 transition-colors",
          isOpen && "border-[#79d5e9]/50"
        )}
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-white"}>
          {displayText}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-[#1a1f2a] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options</div>
            ) : (
              options.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    selected.includes(option)
                      ? "bg-[#79d5e9] border-[#79d5e9]"
                      : "border-gray-600"
                  )}>
                    {selected.includes(option) && <Check className="w-3 h-3 text-[#0f1419]" />}
                  </div>
                  {option}
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-700 px-3 py-2">
              <button
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VehicleRateExplorer() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    manufacturers: [],
    models: [],
    funders: [],
    fuelTypes: [],
    scoreRange: "",
    hasRates: true,
    vehicleCategory: "cars",
  });
  const [manufacturerOptions, setManufacturerOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("avgScore");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchVehicles = useCallback(async (page = 1, autoSelectFirst = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
        sort: sortBy,
        order: sortOrder,
        vehicleCategory: filters.vehicleCategory,
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.manufacturers.length > 0) {
        params.set("manufacturers", filters.manufacturers.join(","));
      }
      if (filters.funders.length > 0) {
        params.set("providers", filters.funders.join(","));
      }
      if (filters.fuelTypes.length > 0) {
        params.set("fuelTypes", filters.fuelTypes.join(","));
      }
      if (filters.scoreRange) {
        params.set("scoreRange", filters.scoreRange);
      }
      if (filters.hasRates) {
        params.set("hasRates", "true");
      }

      const response = await fetch(`/api/admin/vehicle-matrix?${params}`);
      const data = await response.json();

      if (data.vehicles) {
        setVehicles(data.vehicles);
        setPagination(data.pagination);
        if (data.filterOptions?.manufacturers) {
          setManufacturerOptions(data.filterOptions.manufacturers);
        }
        // Auto-select first vehicle only on initial load or filter changes
        if (autoSelectFirst && data.vehicles.length > 0) {
          setSelectedVehicleId(data.vehicles[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  useEffect(() => {
    // Auto-select first vehicle when filters change
    fetchVehicles(1, true);
  }, [fetchVehicles]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setSelectedVehicleId(null);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header Row: Title + Filters */}
      <div className="flex items-center gap-4 mb-4">
        {/* Title */}
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-white">Rate Explorer</h1>
          <p className="text-xs text-gray-500">
            {pagination.total.toLocaleString()} vehicles
          </p>
        </div>

        {/* Filters - Inline */}
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#1a1f2a] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#79d5e9]/50"
            />
          </div>

          {/* Manufacturer */}
          <MultiSelectDropdown
            label="Manufacturer"
            options={manufacturerOptions}
            selected={filters.manufacturers}
            onChange={(selected) => {
              setFilters((prev) => ({ ...prev, manufacturers: selected, models: [] }));
              setSelectedVehicleId(null);
            }}
            placeholder="Manufacturer"
          />

          {/* Model - Only show if manufacturers selected */}
          {filters.manufacturers.length > 0 && (
            <MultiSelectDropdown
              label="Model"
              options={modelOptions}
              selected={filters.models}
              onChange={(selected) => {
                setFilters((prev) => ({ ...prev, models: selected }));
                setSelectedVehicleId(null);
              }}
              placeholder="Model"
            />
          )}

          {/* Funders */}
          <MultiSelectDropdown
            label="Funders"
            options={FUNDERS.map(p => p.name)}
            selected={filters.funders.map(code => FUNDERS.find(p => p.code === code)?.name || code)}
            onChange={(selectedNames) => {
              const selectedCodes = selectedNames.map(name =>
                FUNDERS.find(p => p.name === name)?.code || name.toLowerCase()
              );
              setFilters((prev) => ({ ...prev, funders: selectedCodes }));
              setSelectedVehicleId(null);
            }}
            placeholder="Funders"
          />

          {/* Fuel Type */}
          <MultiSelectDropdown
            label="Fuel"
            options={FUEL_TYPES}
            selected={filters.fuelTypes}
            onChange={(selected) => {
              setFilters((prev) => ({ ...prev, fuelTypes: selected }));
              setSelectedVehicleId(null);
            }}
            placeholder="Fuel Type"
          />

          {/* Score Range */}
          <select
            value={filters.scoreRange}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, scoreRange: e.target.value }));
              setSelectedVehicleId(null);
            }}
            className="bg-[#1a1f2a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#79d5e9]/50"
          >
            {SCORE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '1rem', minHeight: 0 }}>
        {/* Vehicle List (Left Panel) */}
        <div style={{ width: 420, flexShrink: 0 }} className="bg-[#161c24] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          {/* List Header with Cars/Vans Toggle and Sort */}
          <div className="px-4 py-2.5 border-b border-gray-800">
            <div className="flex items-center justify-between">
              {/* Cars/Vans Toggle */}
              <div className="flex rounded-lg bg-[#1a1f2a] p-0.5">
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, vehicleCategory: "cars" }));
                    setSelectedVehicleId(null);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    filters.vehicleCategory === "cars"
                      ? "bg-[#79d5e9] text-[#0f1419]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Cars
                </button>
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, vehicleCategory: "vans" }));
                    setSelectedVehicleId(null);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    filters.vehicleCategory === "vans"
                      ? "bg-[#79d5e9] text-[#0f1419]"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Vans
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  className="appearance-none bg-[#1a1f2a] border border-gray-700 rounded-md px-3 py-1 pr-7 text-xs text-white focus:outline-none focus:border-[#79d5e9]/50 cursor-pointer"
                >
                  <option value="avgScore-desc">Best Score</option>
                  <option value="minPrice-asc">Lowest Price</option>
                  <option value="rateCount-desc">Most Rates</option>
                  <option value="manufacturer-asc">A-Z</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">
              {vehicles.length} of {pagination.total.toLocaleString()} vehicles
            </p>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 border-b border-gray-800/50 animate-pulse">
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-1.5" />
                    <div className="h-3 bg-gray-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">No vehicles found</p>
              </div>
            ) : (
              <div>
                {vehicles.map((vehicle) => (
                  <VehicleListItem
                    key={vehicle.id}
                    vehicle={vehicle}
                    isSelected={vehicle.id === selectedVehicleId}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination - Larger Buttons */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
              <button
                onClick={() => fetchVehicles(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a1f2a] text-gray-300 hover:text-white hover:bg-[#252b38] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchVehicles(pagination.page + 1)}
                disabled={!pagination.hasMore}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a1f2a] text-gray-300 hover:text-white hover:bg-[#252b38] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Vehicle Detail (Right Panel) */}
        <div style={{ flex: 1, overflow: 'auto' }} className="bg-[#161c24] rounded-xl border border-gray-800">
          {selectedVehicleId ? (
            <VehicleDetailPanel vehicleId={selectedVehicleId} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a vehicle to view rates</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
