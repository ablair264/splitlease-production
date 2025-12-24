"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Tag,
  Car,
  Loader2,
  Play,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertCircle,
  Sparkles,
  Zap,
  Square,
} from "lucide-react";
import type { VehicleMatrixRow } from "@/app/api/admin/vehicle-matrix/route";
import { VehicleRatesPanel } from "./vehicle-rates-panel";
import { apiFetch } from "@/lib/utils";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type FilterState = {
  search: string;
  manufacturers: string[];
  vehicleCategory: "cars" | "vans" | "all";
  providers: string[];
  hasRates: "all" | "true" | "false";
};

const PROVIDER_OPTIONS = [
  { value: "lex", label: "Lex" },
  { value: "ogilvie", label: "Ogilvie" },
  { value: "venus", label: "Venus" },
];

type SortState = {
  field: "manufacturer" | "model" | "avgScore" | "minPrice" | "rateCount";
  order: "asc" | "desc";
};

const DEFAULT_FILTERS: FilterState = {
  search: "",
  manufacturers: [],
  vehicleCategory: "cars",
  providers: [],
  hasRates: "all",
};

const DEFAULT_SORT: SortState = {
  field: "manufacturer",
  order: "asc",
};

const BULK_QUOTE_TERMS = [24, 36, 48];
const BULK_QUOTE_MILEAGES = [10000];

const BULK_QUOTE_CONTRACTS = [
  { type: "contract_hire_without_maintenance", label: "CH (NM)", shortLabel: "CHNM", maintenance: false },
  { type: "contract_hire_with_maintenance", label: "CH (WM)", shortLabel: "CH", maintenance: true },
  { type: "personal_contract_hire_without_maint", label: "PCH (NM)", shortLabel: "PCHNM", maintenance: false },
  { type: "personal_contract_hire", label: "PCH (WM)", shortLabel: "PCH", maintenance: true },
];

const PAYMENT_PLAN_OPTIONS = [
  { value: "spread_3_down", label: "3+N (Spread 3 Down)", multiplier: 3 },
  { value: "spread_6_down", label: "6+N (Spread 6 Down)", multiplier: 6 },
  { value: "spread_9_down", label: "9+N (Spread 9 Down)", multiplier: 9 },
  { value: "spread_12_down", label: "12+N (Spread 12 Down)", multiplier: 12 },
  { value: "monthly_in_advance", label: "1+N (Monthly in Advance)", multiplier: 1 },
];

type BulkQuoteProgress = {
  isRunning: boolean;
  currentVehicle: string;
  currentCombo: string;
  totalVehicles: number;
  processedVehicles: number;
  totalQuotes: number;
  processedQuotes: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  requiresSession: boolean;
};

export function VehicleMatrix() {
  const [vehicles, setVehicles] = useState<VehicleMatrixRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [manufacturerOptions, setManufacturerOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  // Bulk quote state
  const [bulkQuoteProgress, setBulkQuoteProgress] = useState<BulkQuoteProgress>({
    isRunning: false,
    currentVehicle: "",
    currentCombo: "",
    totalVehicles: 0,
    processedVehicles: 0,
    totalQuotes: 0,
    processedQuotes: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    requiresSession: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Bulk quote config state
  const [showBulkQuoteConfig, setShowBulkQuoteConfig] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(
    new Set(BULK_QUOTE_CONTRACTS.map(c => c.type))
  );
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState("spread_6_down");

  const [searchInput, setSearchInput] = useState("");

  const fetchVehicles = useCallback(async (page = 1, clearExpanded = true) => {
    setIsLoading(true);
    if (clearExpanded) {
      setExpandedVehicles(new Set());
    }
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
        vehicleCategory: filters.vehicleCategory,
        sort: sort.field,
        order: sort.order,
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.manufacturers.length > 0) {
        params.set("manufacturers", filters.manufacturers.join(","));
      }
      if (filters.providers.length > 0) {
        params.set("providers", filters.providers.join(","));
      }
      if (filters.hasRates !== "all") {
        params.set("hasRates", filters.hasRates);
      }

      const res = await fetch(`/api/admin/vehicle-matrix?${params}`);
      const data = await res.json();

      if (data.vehicles) {
        setVehicles(data.vehicles);
        setPagination(data.pagination);
        if (data.filterOptions?.manufacturers) {
          setManufacturerOptions(data.filterOptions.manufacturers);
        }
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    fetchVehicles(1);
  }, [filters, sort]);

  const toggleSort = (field: SortState["field"]) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const SortIndicator = ({ field }: { field: SortState["field"] }) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-white/20" />;
    }
    return sort.order === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleExpand = (vehicleId: string) => {
    setExpandedVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const toggleSelect = (vehicleId: string) => {
    setSelectedVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedVehicles(new Set(vehicles.map((v) => v.id)));
  };

  const clearSelection = () => {
    setSelectedVehicles(new Set());
  };

  const openBulkQuoteConfig = () => {
    if (selectedVehicles.size === 0) return;
    setShowBulkQuoteConfig(true);
  };

  const runBulkQuotes = async () => {
    if (selectedVehicles.size === 0) return;
    setShowBulkQuoteConfig(false);

    const contractsToRun = BULK_QUOTE_CONTRACTS.filter(c => selectedContracts.has(c.type));
    if (contractsToRun.length === 0) {
      alert("Please select at least one contract type.");
      return;
    }

    const allSelectedVehicles = vehicles.filter((v) => selectedVehicles.has(v.id));
    const selectedVehicleData = allSelectedVehicles.filter(
      (v) => v.lexMakeCode && v.lexModelCode && v.lexVariantCode
    );

    const skippedCount = allSelectedVehicles.length - selectedVehicleData.length;
    if (skippedCount > 0) {
      console.warn(`Skipping ${skippedCount} vehicles without Lex codes`);
    }

    if (selectedVehicleData.length === 0) {
      alert("None of the selected vehicles have Lex codes. Please select vehicles with Lex mapping.");
      return;
    }

    const totalQuotes = selectedVehicleData.length * BULK_QUOTE_TERMS.length * BULK_QUOTE_MILEAGES.length * contractsToRun.length;

    setBulkQuoteProgress({
      isRunning: true,
      currentVehicle: "",
      currentCombo: "",
      totalVehicles: selectedVehicleData.length,
      processedVehicles: 0,
      totalQuotes,
      processedQuotes: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      requiresSession: false,
    });

    abortControllerRef.current = new AbortController();

    let processedQuotes = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (let vIdx = 0; vIdx < selectedVehicleData.length; vIdx++) {
        const vehicle = selectedVehicleData[vIdx];

        if (abortControllerRef.current?.signal.aborted) break;

        for (const term of BULK_QUOTE_TERMS) {
          for (const mileage of BULK_QUOTE_MILEAGES) {
            for (const contract of contractsToRun) {
              if (abortControllerRef.current?.signal.aborted) break;

              const comboLabel = `${term}m / ${(mileage / 1000)}k / ${contract.label}`;

              setBulkQuoteProgress((prev) => ({
                ...prev,
                currentVehicle: `${vehicle.manufacturer} ${vehicle.model}`,
                currentCombo: comboLabel,
              }));

              try {
                const response = await apiFetch("/api/lex-autolease/run-quotes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    vehicles: [{
                      makeCode: vehicle.lexMakeCode,
                      modelCode: vehicle.lexModelCode,
                      variantCode: vehicle.lexVariantCode,
                      make: vehicle.manufacturer,
                      model: vehicle.model,
                      variant: vehicle.variant,
                      capCode: vehicle.capCode,
                      vehicleId: vehicle.id,
                    }],
                    term,
                    mileage,
                    maintenanceIncluded: contract.maintenance,
                    paymentPlan: selectedPaymentPlan,
                    contractType: contract.type,
                  }),
                  signal: abortControllerRef.current?.signal,
                });

                const result = await response.json();

                if (response.status === 401 && result.requiresSession) {
                  setBulkQuoteProgress((prev) => ({
                    ...prev,
                    isRunning: false,
                    requiresSession: true,
                  }));
                  return;
                }

                const vehicleResult = result.results?.[0];
                if (vehicleResult?.success) {
                  successCount++;
                } else {
                  errorCount++;
                  const errorMsg = vehicleResult?.error || result.error || "Unknown error";
                  errors.push(`${vehicle.manufacturer} ${vehicle.model} (${comboLabel}): ${errorMsg}`);

                  if (errorMsg.includes("InvalidAccessException") || errorMsg.includes("Unauthorised")) {
                    setBulkQuoteProgress((prev) => ({
                      ...prev,
                      isRunning: false,
                      requiresSession: true,
                      processedQuotes,
                      successCount,
                      errorCount,
                      errors: ["Session expired. Please capture a new Lex session and try again."],
                    }));
                    return;
                  }
                }
              } catch (error) {
                if ((error as Error).name === "AbortError") break;
                errorCount++;
                errors.push(`${vehicle.manufacturer} ${vehicle.model} (${comboLabel}): ${(error as Error).message}`);
              }

              processedQuotes++;
              setBulkQuoteProgress((prev) => ({
                ...prev,
                processedQuotes,
                successCount,
                errorCount,
                errors: errors.slice(-5),
              }));

              await new Promise((r) => setTimeout(r, 300));
            }
          }
        }

        setBulkQuoteProgress((prev) => ({
          ...prev,
          processedVehicles: vIdx + 1,
        }));
      }
    } finally {
      setBulkQuoteProgress((prev) => ({
        ...prev,
        isRunning: false,
        currentVehicle: "",
        currentCombo: "",
      }));

      fetchVehicles(pagination.page, false);
    }
  };

  const cancelBulkQuotes = () => {
    abortControllerRef.current?.abort();
    setBulkQuoteProgress((prev) => ({
      ...prev,
      isRunning: false,
    }));
  };

  const dismissProgress = () => {
    setBulkQuoteProgress({
      isRunning: false,
      currentVehicle: "",
      currentCombo: "",
      totalVehicles: 0,
      processedVehicles: 0,
      totalQuotes: 0,
      processedQuotes: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      requiresSession: false,
    });
    clearSelection();
  };

  // Check if we should show results (completed with data)
  const showProgressResults = !bulkQuoteProgress.isRunning &&
    (bulkQuoteProgress.successCount > 0 || bulkQuoteProgress.errorCount > 0);

  return (
    <div className="space-y-5 font-sans pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)",
                border: "1px solid rgba(20, 184, 166, 0.25)",
              }}
            >
              <Car className="w-6 h-6 text-teal-400" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Vehicle Pricing Matrix</h1>
            <p className="text-white/50 text-sm font-medium mt-0.5">
              {pagination.total.toLocaleString()} vehicles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${showFilters
                ? "text-teal-400 bg-teal-500/10 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
                : "text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/8 border-white/10"
              }
            `}
            style={{ border: "1px solid" }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Inline Progress Panel - Replaces header during bulk operation */}
      {(bulkQuoteProgress.isRunning || showProgressResults) && (
        <div
          className="p-4 rounded-2xl border"
          style={{
            background: bulkQuoteProgress.requiresSession
              ? "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)"
              : bulkQuoteProgress.isRunning
                ? "linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)"
                : "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)",
            borderColor: bulkQuoteProgress.requiresSession
              ? "rgba(245, 158, 11, 0.2)"
              : bulkQuoteProgress.isRunning
                ? "rgba(20, 184, 166, 0.2)"
                : "rgba(16, 185, 129, 0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {bulkQuoteProgress.isRunning ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-teal-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Running Lex Quotes</p>
                    <p className="text-xs text-white/50">
                      {bulkQuoteProgress.currentVehicle} • {bulkQuoteProgress.currentCombo}
                    </p>
                  </div>
                </>
              ) : bulkQuoteProgress.requiresSession ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-400">Session Required</p>
                    <p className="text-xs text-white/50">Please capture a new Lex session</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Quotes Complete</p>
                    <p className="text-xs text-white/50">
                      {bulkQuoteProgress.successCount} successful, {bulkQuoteProgress.errorCount} failed
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {bulkQuoteProgress.isRunning ? (
                <button
                  onClick={cancelBulkQuotes}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={dismissProgress}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${bulkQuoteProgress.totalQuotes > 0 ? (bulkQuoteProgress.processedQuotes / bulkQuoteProgress.totalQuotes) * 100 : 0}%`,
                  background: bulkQuoteProgress.requiresSession
                    ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(90deg, #14b8a6 0%, #06b6d4 100%)",
                  boxShadow: "0 0 10px rgba(20, 184, 166, 0.5)"
                }}
              />
            </div>
            <span className="text-xs font-semibold text-white/60 min-w-[80px] text-right">
              {bulkQuoteProgress.processedQuotes} / {bulkQuoteProgress.totalQuotes}
            </span>
          </div>

          {/* Stats Row */}
          {(bulkQuoteProgress.successCount > 0 || bulkQuoteProgress.errorCount > 0) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              <span className="text-xs text-white/40">
                Vehicles: <span className="text-white/70 font-medium">{bulkQuoteProgress.processedVehicles}/{bulkQuoteProgress.totalVehicles}</span>
              </span>
              <span className="text-xs text-emerald-400">
                Success: <span className="font-medium">{bulkQuoteProgress.successCount}</span>
              </span>
              {bulkQuoteProgress.errorCount > 0 && (
                <span className="text-xs text-rose-400">
                  Errors: <span className="font-medium">{bulkQuoteProgress.errorCount}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div
          className="p-5 rounded-2xl border space-y-5 transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(30, 35, 45, 0.8) 0%, rgba(20, 25, 35, 0.9) 100%)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          <div className="flex flex-wrap gap-4">
            {/* Search Input */}
            <div className="flex-1 min-w-[280px]">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-teal-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by make, model, variant..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>

            {/* Manufacturer Select */}
            <div className="relative">
              <select
                value={filters.manufacturers[0] || ""}
                onChange={(e) => setFilters((prev) => ({
                  ...prev,
                  manufacturers: e.target.value ? [e.target.value] : [],
                }))}
                className="appearance-none px-4 py-3 pr-10 rounded-xl text-sm bg-black/40 border border-white/10 text-white min-w-[160px] focus:outline-none focus:border-teal-500/50 cursor-pointer hover:bg-black/50 transition-all"
              >
                <option value="">All Makes</option>
                {manufacturerOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Vehicle Category */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
              {[
                { value: "cars", label: "Cars" },
                { value: "vans", label: "Vans" },
                { value: "all", label: "All" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilters((prev) => ({
                    ...prev,
                    vehicleCategory: option.value as "cars" | "vans" | "all",
                  }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.vehicleCategory === option.value
                      ? "bg-teal-500/20 text-teal-400 shadow-sm"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Quick:</span>
            {[
              { value: "all", label: "All Vehicles" },
              { value: "true", label: "Has Rates" },
              { value: "false", label: "No Rates" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters((prev) => ({
                  ...prev,
                  hasRates: option.value as "all" | "true" | "false",
                }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filters.hasRates === option.value
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-white/50 hover:text-white/70 hover:bg-white/5 border border-transparent"
                }`}
              >
                {option.value === filters.hasRates && <span className="mr-1">●</span>}
                {option.label}
              </button>
            ))}

            <div className="w-px h-5 bg-white/10 mx-2" />

            {/* Provider Pills */}
            {PROVIDER_OPTIONS.map((provider) => {
              const isSelected = filters.providers.includes(provider.value);
              return (
                <button
                  key={provider.value}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      providers: isSelected
                        ? prev.providers.filter((p) => p !== provider.value)
                        : [...prev.providers, provider.value],
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    isSelected
                      ? "bg-teal-500/20 border-teal-500/40 text-teal-400"
                      : "bg-black/30 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {provider.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(30, 35, 45, 0.6) 0%, rgba(20, 25, 35, 0.8) 100%)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
        }}
      >
        {/* Table Header - Vehicle + Specs layout */}
        <div
          className="grid grid-cols-[44px_1fr_90px_70px_90px_80px_70px_32px] gap-3 px-5 py-4 border-b text-xs font-semibold text-white/40 uppercase tracking-wider"
          style={{ borderColor: "rgba(255, 255, 255, 0.08)", background: "rgba(0,0,0,0.2)" }}
        >
          <div></div>
          <button
            onClick={() => toggleSort("manufacturer")}
            className="flex items-center gap-1.5 hover:text-white/60 transition-colors text-left group"
          >
            Vehicle
            <SortIndicator field="manufacturer" />
          </button>
          <div className="text-right">P11D</div>
          <div className="text-center">CO2</div>
          <div>Fuel</div>
          <div>Trans</div>
          <button
            onClick={() => toggleSort("rateCount")}
            className="flex items-center gap-1.5 hover:text-white/60 transition-colors justify-center group"
          >
            Rates
            <SortIndicator field="rateCount" />
          </button>
          <div></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/[0.04]">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
                <span className="text-teal-400 font-medium">Loading vehicles...</span>
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Car className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/40 font-medium">No vehicles found</p>
                <p className="text-white/25 text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div key={vehicle.id}>
                {/* Vehicle Row - Specs inline layout */}
                <div
                  className={`grid grid-cols-[44px_1fr_90px_70px_90px_80px_70px_32px] gap-3 px-5 py-3.5 items-center cursor-pointer transition-all duration-200 group ${
                    expandedVehicles.has(vehicle.id)
                      ? "bg-teal-500/[0.06]"
                      : "hover:bg-white/[0.03]"
                  }`}
                  onClick={() => toggleExpand(vehicle.id)}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(vehicle.id);
                      }}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                        selectedVehicles.has(vehicle.id)
                          ? "bg-teal-500 border-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.4)]"
                          : "border-white/20 hover:border-white/40 group-hover:border-white/30"
                      }`}
                    >
                      {selectedVehicles.has(vehicle.id) && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </button>
                  </div>

                  {/* Vehicle Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-semibold truncate">
                        {vehicle.manufacturer} {vehicle.model}
                      </span>
                      {vehicle.hasFleetDiscount && (
                        <Tag className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/40 truncate">
                        {vehicle.variant}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="font-mono text-[11px] text-amber-500/50">
                        {vehicle.capCode || "No CAP"}
                      </span>
                    </div>
                  </div>

                  {/* P11D */}
                  <div className="text-right">
                    {vehicle.p11d ? (
                      <span className="text-sm text-white/70 font-medium">
                        £{(vehicle.p11d / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-white/20 text-sm">—</span>
                    )}
                  </div>

                  {/* CO2 */}
                  <div className="text-center">
                    {vehicle.co2 ? (
                      <span className="text-sm text-white/60">{vehicle.co2}</span>
                    ) : (
                      <span className="text-white/20 text-sm">—</span>
                    )}
                  </div>

                  {/* Fuel Type */}
                  <div>
                    {vehicle.fuelType ? (
                      <span className="text-xs text-white/50 capitalize truncate block">
                        {vehicle.fuelType}
                      </span>
                    ) : (
                      <span className="text-white/20 text-sm">—</span>
                    )}
                  </div>

                  {/* Transmission */}
                  <div>
                    {vehicle.transmission ? (
                      <span className="text-xs text-white/50 capitalize truncate block">
                        {vehicle.transmission}
                      </span>
                    ) : (
                      <span className="text-white/20 text-sm">—</span>
                    )}
                  </div>

                  {/* Rate Count */}
                  <div className="text-center">
                    {vehicle.rateCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-semibold text-white/60 bg-white/5 rounded-md">
                        {vehicle.rateCount}
                      </span>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </div>

                  {/* Expand Chevron */}
                  <div className="flex items-center justify-center">
                    <div className={`transition-transform duration-200 ${expandedVehicles.has(vehicle.id) ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/50" />
                    </div>
                  </div>
                </div>

                {/* Expanded Panel */}
                {expandedVehicles.has(vehicle.id) && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <VehicleRatesPanel vehicle={vehicle} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            className="px-5 py-4 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)", background: "rgba(0,0,0,0.15)" }}
          >
            <div className="text-sm text-white/40">
              Page <span className="text-white/60 font-medium">{pagination.page}</span> of{" "}
              <span className="text-white/60 font-medium">{pagination.totalPages}</span>
              <span className="mx-2 text-white/20">•</span>
              <span className="text-white/50">{pagination.total.toLocaleString()} total</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchVehicles(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-white/10"
              >
                Previous
              </button>
              <button
                onClick={() => fetchVehicles(pagination.page + 1)}
                disabled={!pagination.hasMore}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-white/10"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Selection Bar */}
      {selectedVehicles.size > 0 && !bulkQuoteProgress.isRunning && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-4 border-t"
          style={{
            background: "linear-gradient(180deg, rgba(20, 25, 35, 0.95) 0%, rgba(10, 15, 25, 0.98) 100%)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4)"
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-teal-400" />
                </div>
                <span className="text-sm font-semibold text-white">
                  {selectedVehicles.size} vehicle{selectedVehicles.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="text-xs font-medium text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Select All
              </button>
              <button
                onClick={openBulkQuoteConfig}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                  boxShadow: "0 4px 20px rgba(20, 184, 166, 0.3)"
                }}
              >
                <Zap className="w-4 h-4" />
                Configure Bulk Quotes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Quote Config Modal */}
      {showBulkQuoteConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-md mx-4 rounded-3xl border shadow-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #1e232d 0%, #14181f 100%)",
              borderColor: "rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Configure Bulk Quotes</h3>
                    <p className="text-sm text-white/40 mt-0.5">
                      {selectedVehicles.size} vehicles × {BULK_QUOTE_TERMS.length} terms × {selectedContracts.size} contracts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkQuoteConfig(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contract Types */}
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3">Contract Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {BULK_QUOTE_CONTRACTS.map((contract) => (
                    <button
                      key={contract.type}
                      onClick={() => {
                        const newSet = new Set(selectedContracts);
                        if (newSet.has(contract.type)) {
                          newSet.delete(contract.type);
                        } else {
                          newSet.add(contract.type);
                        }
                        setSelectedContracts(newSet);
                      }}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        selectedContracts.has(contract.type)
                          ? "bg-teal-500/15 border-teal-500/40 text-teal-400"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedContracts.has(contract.type)
                            ? "bg-teal-500 border-teal-500"
                            : "border-white/30"
                        }`}>
                          {selectedContracts.has(contract.type) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        {contract.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Plan */}
              <div>
                <label className="block text-sm font-semibold text-white/60 mb-3">Initial Payment</label>
                <div className="relative">
                  <select
                    value={selectedPaymentPlan}
                    onChange={(e) => setSelectedPaymentPlan(e.target.value)}
                    className="w-full appearance-none px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50 cursor-pointer"
                  >
                    {PAYMENT_PLAN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-gray-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Terms Info */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Quote Configuration</span>
                </div>
                <p className="text-xs text-white/50 mt-2">
                  Terms: <span className="text-white/70">{BULK_QUOTE_TERMS.join(", ")} months</span>
                  <span className="mx-2">•</span>
                  Mileage: <span className="text-white/70">{BULK_QUOTE_MILEAGES.map(m => `${m/1000}k`).join(", ")}</span>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowBulkQuoteConfig(false)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runBulkQuotes}
                disabled={selectedContracts.size === 0}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                  boxShadow: "0 4px 15px rgba(20, 184, 166, 0.3)"
                }}
              >
                <Play className="w-4 h-4" />
                Run Quotes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
