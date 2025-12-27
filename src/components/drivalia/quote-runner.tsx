"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Car,
  Play,
  Trash2,
  Settings2,
  XCircle,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import { ExpandableCard } from "@/components/shared/expandable-card";

type Vehicle = {
  id: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  modelYear: string;
  fuelType: string;
  transmission: string;
  bodyStyle: string;
  co2: number;
  p11d: number;
};

type QueueItem = {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  term: number;
  mileage: number;
  contractType: string;
  status: "pending" | "running" | "complete" | "error";
  result?: {
    quoteId?: string;
    monthlyRental?: number;
    initialRental?: number;
  };
  error?: string;
  batchId?: string;
  createdAt?: string;
};

type QuoteConfig = {
  terms: number[];
  mileages: number[];
  contractTypes: string[];
};

const TERMS = [24, 36, 48, 60];
const MILEAGES = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const CONTRACT_TYPES = [
  { value: "BCH", label: "Business CH" },
  { value: "BCHNM", label: "BCH (No Maint)" },
  { value: "PCH", label: "Personal CH" },
];

const ITEMS_PER_PAGE = 20;

// Multi-select chip component
function ChipSelect<T extends string | number>({
  options,
  selected,
  onChange,
  renderLabel,
}: {
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  renderLabel: (option: T) => string;
}) {
  const toggle = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={String(option)}
              onClick={() => toggle(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                isSelected
                  ? "bg-pink-500/30 border-pink-500/50 text-pink-300"
                  : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
              }`}
            >
              {renderLabel(option)}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={selectAll}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Select all
        </button>
        <span className="text-white/20">•</span>
        <button
          onClick={clearAll}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function DrivaliaQuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  // Vehicle search
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Quote configuration
  const [config, setConfig] = useState<QuoteConfig>({
    terms: [36],
    mileages: [10000],
    contractTypes: ["BCH"],
  });

  // Selected vehicles
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Current queue state
  const [currentQueue, setCurrentQueue] = useState<QueueItem[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Calculate total quotes
  const totalQuotes = useMemo(() => {
    return (
      selectedVehicles.length *
      config.terms.length *
      config.mileages.length *
      config.contractTypes.length
    );
  }, [selectedVehicles.length, config.terms.length, config.mileages.length, config.contractTypes.length]);

  // Fetch vehicles with CAP codes
  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("requirePricing", "false");
      params.set("hasCapCode", "true");
      params.set("limit", "1000");
      if (selectedMake) params.set("make", selectedMake);

      const response = await fetch(`/api/vehicles?${params}`);
      const data = await response.json();

      const vehiclesWithCap = (data.vehicles || []).filter((v: Vehicle) => v.capCode);
      setVehicles(vehiclesWithCap);
      if (!makes.length && data.makes) setMakes(data.makes);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [selectedMake]);

  // Filter vehicles by search query
  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.manufacturer?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.variant?.toLowerCase().includes(query) ||
      v.capCode?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMake, searchQuery]);

  // Toggle vehicle selection
  const toggleVehicle = (vehicle: Vehicle) => {
    if (selectedVehicles.some((v) => v.id === vehicle.id)) {
      setSelectedVehicles(selectedVehicles.filter((v) => v.id !== vehicle.id));
    } else {
      setSelectedVehicles([...selectedVehicles, vehicle]);
    }
  };

  // Remove from selected
  const removeVehicle = (vehicleId: string) => {
    setSelectedVehicles(selectedVehicles.filter((v) => v.id !== vehicleId));
  };

  // Clear all selected vehicles
  const clearAll = () => {
    setSelectedVehicles([]);
  };

  // Clear the queue
  const clearQueue = () => {
    setCurrentQueue([]);
    setCurrentBatchId(null);
    setIsPolling(false);
  };

  // Open Drivalia portal
  const openPortal = () => {
    window.open(
      "https://www.caafgenus3.co.uk/WebApp/fmoportal/index.html#/quoting/new",
      "_blank"
    );
  };

  // Fetch current queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/drivalia/quote-queue?_t=${Date.now()}`);
      const data = await response.json();
      if (data.queue) {
        const items = currentBatchId
          ? data.queue.filter((q: QueueItem) => q.batchId === currentBatchId)
          : data.queue;
        setCurrentQueue(items);

        const pendingOrRunning = items.filter(
          (q: QueueItem) => q.status === "pending" || q.status === "running"
        );
        if (items.length > 0 && pendingOrRunning.length === 0) {
          setIsPolling(false);
          onQuotesComplete?.();
        }
      }
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  }, [currentBatchId, onQuotesComplete]);

  // Poll for queue updates
  useEffect(() => {
    if (!isPolling || !currentBatchId) return;

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, [isPolling, currentBatchId, fetchQueueStatus]);

  // Send queue to API
  const sendQueueToApi = async () => {
    if (selectedVehicles.length === 0) return;
    if (config.terms.length === 0 || config.mileages.length === 0 || config.contractTypes.length === 0) {
      alert("Please select at least one option for Term, Mileage, and Contract Type");
      return;
    }

    setIsProcessing(true);

    try {
      const items: {
        vehicleId: string;
        capCode: string;
        manufacturer: string;
        model: string;
        variant: string;
        term: number;
        mileage: number;
        contractType: string;
      }[] = [];

      for (const vehicle of selectedVehicles) {
        for (const term of config.terms) {
          for (const mileage of config.mileages) {
            for (const contractType of config.contractTypes) {
              items.push({
                vehicleId: vehicle.id,
                capCode: vehicle.capCode,
                manufacturer: vehicle.manufacturer,
                model: vehicle.model,
                variant: vehicle.variant,
                term,
                mileage,
                contractType,
              });
            }
          }
        }
      }

      const response = await fetch("/api/drivalia/quote-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBatchId(data.batchId);
        setSelectedVehicles([]);
        setIsPolling(true);
        await fetchQueueStatus();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to send queue");
      }
    } catch (error) {
      console.error("Failed to send queue:", error);
      alert("Failed to send queue to server");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-pink-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `£${value.toFixed(2)}`;
  };

  const getContractLabel = (type: string) => {
    const labels: Record<string, string> = {
      BCH: "BCH",
      BCHNM: "BCH (NM)",
      PCH: "PCH",
      PCHNM: "PCH (NM)",
    };
    return labels[type] || type;
  };

  // Queue stats
  const queueStats = useMemo(() => {
    return {
      total: currentQueue.length,
      pending: currentQueue.filter(q => q.status === "pending").length,
      running: currentQueue.filter(q => q.status === "running").length,
      complete: currentQueue.filter(q => q.status === "complete").length,
      error: currentQueue.filter(q => q.status === "error").length,
    };
  }, [currentQueue]);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-xl border bg-pink-500/10 border-pink-500/30">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-pink-400" />
          <div className="flex-1">
            <span className="text-pink-300">
              Select vehicles and quote options below. The system will generate all combinations automatically.
            </span>
          </div>
          <button
            onClick={openPortal}
            className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-sm hover:bg-pink-500/30 transition-colors flex items-center gap-1"
          >
            Open Portal <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Quote Configuration */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-pink-400" />
          Quote Configuration
          <span className="text-xs text-white/40 ml-2">Select multiple options per category</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Terms */}
          <div>
            <label className="text-sm text-white/70 mb-2 block font-medium">
              Contract Term
              {config.terms.length > 0 && (
                <span className="text-pink-400 ml-2">({config.terms.length} selected)</span>
              )}
            </label>
            <ChipSelect
              options={TERMS}
              selected={config.terms}
              onChange={(terms) => setConfig({ ...config, terms })}
              renderLabel={(t) => `${t} mo`}
            />
          </div>

          {/* Mileages */}
          <div>
            <label className="text-sm text-white/70 mb-2 block font-medium">
              Annual Mileage
              {config.mileages.length > 0 && (
                <span className="text-pink-400 ml-2">({config.mileages.length} selected)</span>
              )}
            </label>
            <ChipSelect
              options={MILEAGES}
              selected={config.mileages}
              onChange={(mileages) => setConfig({ ...config, mileages })}
              renderLabel={(m) => `${(m / 1000).toFixed(0)}k`}
            />
          </div>

          {/* Contract Types */}
          <div>
            <label className="text-sm text-white/70 mb-2 block font-medium">
              Contract Type
              {config.contractTypes.length > 0 && (
                <span className="text-pink-400 ml-2">({config.contractTypes.length} selected)</span>
              )}
            </label>
            <ChipSelect
              options={CONTRACT_TYPES.map((ct) => ct.value)}
              selected={config.contractTypes}
              onChange={(contractTypes) => setConfig({ ...config, contractTypes })}
              renderLabel={(v) => CONTRACT_TYPES.find((ct) => ct.value === v)?.label || v}
            />
          </div>
        </div>
      </div>

      {/* Selected Vehicles Summary */}
      <ExpandableCard
        title={`Selected Vehicles (${selectedVehicles.length})`}
        icon={<Car className="h-4 w-4" />}
        defaultExpanded={selectedVehicles.length > 0}
        accentColor="#ec4899"
      >
        {selectedVehicles.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            Select vehicles from the table below
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white/60">
                {totalQuotes.toLocaleString()} total quotes will be generated
                <span className="text-white/40 ml-2">
                  ({selectedVehicles.length} x {config.terms.length} x {config.mileages.length} x {config.contractTypes.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
                <button
                  onClick={sendQueueToApi}
                  disabled={totalQuotes === 0 || isProcessing}
                  className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  style={{
                    background: totalQuotes > 0 && !isProcessing
                      ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                      : "rgba(255,255,255,0.1)",
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generate Queue
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {selectedVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-2 group hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {vehicle.manufacturer} {vehicle.model}
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      {vehicle.variant}
                    </div>
                  </div>
                  <button
                    onClick={() => removeVehicle(vehicle.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ExpandableCard>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={selectedMake}
          onChange={(e) => setSelectedMake(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-[#1a1f2a] border border-white/10 text-white [&>option]:bg-[#1a1f2a] [&>option]:text-white"
        >
          <option value="">All Makes</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </select>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or CAP code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="rounded-lg border border-white/10 bg-[#1a1f2a]/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-12">
                  Select
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Make
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Variant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Fuel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Trans
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  Body
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                  CO2
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {vehiclesLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-white/40" />
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-white/40">
                    No vehicles with CAP codes found
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((vehicle) => {
                  const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => toggleVehicle(vehicle)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-pink-500/10 hover:bg-pink-500/15"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVehicle(vehicle)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-white/20 bg-white/5 text-pink-500 focus:ring-pink-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {vehicle.manufacturer}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {vehicle.model}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/70 max-w-xs truncate">
                        {vehicle.variant}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {vehicle.fuelType}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {vehicle.transmission}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {vehicle.bodyStyle}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {vehicle.co2}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
            <div className="text-sm text-white/60">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredVehicles.length)} of{" "}
              {filteredVehicles.length} vehicles
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded text-sm bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-white/70 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded text-sm bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Queue Status */}
      {currentQueue.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Car className="h-4 w-4 text-pink-400" />
              Quote Queue
              {isPolling && (
                <RefreshCw className="h-3.5 w-3.5 text-pink-400 animate-spin ml-2" />
              )}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                {queueStats.pending > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Clock className="h-3 w-3" />
                    {queueStats.pending} pending
                  </span>
                )}
                {queueStats.running > 0 && (
                  <span className="flex items-center gap-1 text-pink-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {queueStats.running} running
                  </span>
                )}
                {queueStats.complete > 0 && (
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {queueStats.complete} done
                  </span>
                )}
                {queueStats.error > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-3 w-3" />
                    {queueStats.error} failed
                  </span>
                )}
              </div>
              <button
                onClick={clearQueue}
                className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {(queueStats.pending > 0 || queueStats.running > 0) && (
            <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-500"
                style={{
                  width: `${((queueStats.complete + queueStats.error) / queueStats.total) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Queue table */}
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <th className="text-left p-2 text-white/60 font-medium">Vehicle</th>
                  <th className="text-center p-2 text-white/60 font-medium">Term</th>
                  <th className="text-center p-2 text-white/60 font-medium">Mileage</th>
                  <th className="text-center p-2 text-white/60 font-medium">Contract</th>
                  <th className="text-right p-2 text-white/60 font-medium">Monthly</th>
                  <th className="text-center p-2 text-white/60 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentQueue.map((item, idx) => (
                  <tr
                    key={`${item.capCode}-${item.term}-${item.mileage}-${item.contractType}-${idx}`}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td className="p-2">
                      <div className="text-white text-xs font-medium">
                        {item.manufacturer} {item.model}
                      </div>
                      <div className="text-white/40 text-xs font-mono">
                        {item.capCode}
                      </div>
                    </td>
                    <td className="text-center p-2 text-white/80 text-xs">{item.term}m</td>
                    <td className="text-center p-2 text-white/80 text-xs">
                      {(item.mileage / 1000).toFixed(0)}k
                    </td>
                    <td className="text-center p-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-pink-500/20 text-pink-300">
                        {getContractLabel(item.contractType)}
                      </span>
                    </td>
                    <td className="text-right p-2">
                      <span className={item.result?.monthlyRental ? "text-pink-400 font-medium" : "text-white/40"}>
                        {formatCurrency(item.result?.monthlyRental)}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(item.status)}
                        {item.error && (
                          <span className="text-xs text-red-400/70 truncate max-w-[80px]" title={item.error}>
                            {item.error}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Open Portal Button */}
          {queueStats.pending > 0 && (
            <div className="mt-4 p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-pink-300">
                  <strong>{queueStats.pending} quotes pending.</strong> Open the browser extension sidepanel on the Drivalia portal to process.
                </p>
                <button
                  onClick={openPortal}
                  className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-sm hover:bg-pink-500/30 transition-colors flex items-center gap-1"
                >
                  Open Portal <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
