"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Car,
  Play,
  Trash2,
  Calculator,
  Settings2,
  X,
} from "lucide-react";

type Vehicle = {
  id: string;
  cap_code: string;
  manufacturer: string;
  model: string;
  variant: string;
  model_year: string;
  fuel_type: string;
  transmission: string;
  body_style: string;
  co2: number;
  lex_make_code: string;
  lex_model_code: string;
  lex_variant_code: string;
};

type QuoteConfig = {
  terms: number[];
  mileages: number[];
  contractTypes: string[];
};

const TERMS = [24, 36, 48, 60];
const MILEAGES = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const CONTRACT_TYPES = [
  { value: "contract_hire_without_maintenance", label: "CH (No Maint)" },
  { value: "contract_hire_with_maintenance", label: "CH (With Maint)" },
  { value: "personal_contract_hire", label: "PCH" },
];

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
                  ? "bg-[#79d5e9]/30 border-[#79d5e9]/50 text-[#79d5e9]"
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

export function QuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  // Vehicle search
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Quote configuration - now multi-select
  const [config, setConfig] = useState<QuoteConfig>({
    terms: [36],
    mileages: [10000],
    contractTypes: ["contract_hire_without_maintenance"],
  });

  // Selected vehicles
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueSent, setQueueSent] = useState(false);

  // Calculate total quotes
  const totalQuotes = useMemo(() => {
    return (
      selectedVehicles.length *
      config.terms.length *
      config.mileages.length *
      config.contractTypes.length
    );
  }, [selectedVehicles.length, config.terms.length, config.mileages.length, config.contractTypes.length]);

  // Fetch vehicles with Lex codes
  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams({ hasLexCodes: "true" });
      if (selectedMake) params.set("make", selectedMake);

      const response = await fetch(`/api/lex-autolease/vehicles?${params}`);
      const data = await response.json();
      setVehicles(data.vehicles || []);
      if (!makes.length) setMakes(data.makes || []);
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
      v.variant?.toLowerCase().includes(query)
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

  // Clear all
  const clearAll = () => {
    setSelectedVehicles([]);
    setQueueSent(false);
  };

  // Generate all quote combinations and save to server
  const saveQueueToServer = async () => {
    if (selectedVehicles.length === 0) return;
    if (config.terms.length === 0 || config.mileages.length === 0 || config.contractTypes.length === 0) {
      alert("Please select at least one option for Term, Mileage, and Contract Type");
      return;
    }

    setIsProcessing(true);

    try {
      // Generate all combinations
      const vehicleQueue: {
        vehicleId: string;
        capCode: string;
        manufacturer: string;
        model: string;
        variant: string;
        lexMakeCode: string;
        lexModelCode: string;
        lexVariantCode: string;
        term: number;
        mileage: number;
        contractType: string;
        co2: number;
      }[] = [];

      for (const vehicle of selectedVehicles) {
        for (const term of config.terms) {
          for (const mileage of config.mileages) {
            for (const contractType of config.contractTypes) {
              vehicleQueue.push({
                vehicleId: vehicle.id,
                capCode: vehicle.cap_code,
                manufacturer: vehicle.manufacturer,
                model: vehicle.model,
                variant: vehicle.variant,
                lexMakeCode: vehicle.lex_make_code,
                lexModelCode: vehicle.lex_model_code,
                lexVariantCode: vehicle.lex_variant_code,
                term,
                mileage,
                contractType,
                co2: vehicle.co2,
              });
            }
          }
        }
      }

      const response = await fetch("/api/lex-autolease/quote-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles: vehicleQueue }),
      });

      if (response.ok) {
        setQueueSent(true);
        setSelectedVehicles([]);
        onQuotesComplete?.();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to send queue");
      }
    } catch (error) {
      console.error("Failed to save queue:", error);
      alert("Failed to save queue to server");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show success message if queue was sent
  if (queueSent) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl border bg-green-500/10 border-green-500/30">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Queue Sent Successfully!
              </h3>
              <p className="text-sm text-white/60 mb-4">
                Open the browser extension sidepanel and click the Lex tab to process the queue.
                Make sure the Lex Autolease portal is open and you&apos;re logged in.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://associate.lexautolease.co.uk/quote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#79d5e9]/20 text-[#79d5e9] hover:bg-[#79d5e9]/30 transition-colors"
                >
                  Open Lex Portal <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setQueueSent(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Queue More Vehicles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-xl border bg-[#79d5e9]/10 border-[#79d5e9]/30">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-[#79d5e9]" />
          <div className="flex-1">
            <span className="text-[#79d5e9]">
              Select vehicles and quote options below. The system will generate all combinations automatically.
            </span>
          </div>
          <a
            href="https://associate.lexautolease.co.uk/quote"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#79d5e9]/20 text-[#79d5e9] text-sm hover:bg-[#79d5e9]/30 transition-colors flex items-center gap-1"
          >
            Open Portal <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Quote Configuration - Full Width */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#79d5e9]" />
          Quote Configuration
          <span className="text-xs text-white/40 ml-2">Select multiple options per category</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Terms */}
          <div>
            <label className="text-sm text-white/70 mb-2 block font-medium">
              Contract Term
              {config.terms.length > 0 && (
                <span className="text-[#79d5e9] ml-2">({config.terms.length} selected)</span>
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
                <span className="text-[#79d5e9] ml-2">({config.mileages.length} selected)</span>
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
                <span className="text-[#79d5e9] ml-2">({config.contractTypes.length} selected)</span>
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

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Vehicle Picker */}
        <div
          className="rounded-xl border p-4"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Car className="h-4 w-4 text-[#79d5e9]" />
            Select Vehicles
            <span className="text-xs text-white/40 ml-2">
              {filteredVehicles.length} with Lex codes
            </span>
          </h3>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
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
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Vehicle List */}
          <div className="max-h-[350px] overflow-y-auto space-y-2">
            {vehiclesLoading ? (
              <div className="text-center py-8 text-white/40">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                No vehicles with Lex codes found
              </div>
            ) : (
              paginatedVehicles.map((vehicle) => {
                const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#79d5e9]/10 border-[#79d5e9]/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => toggleVehicle(vehicle)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {vehicle.manufacturer} {vehicle.model}
                        </div>
                        <div className="text-xs text-white/50">
                          {vehicle.variant} • {vehicle.fuel_type} • {vehicle.transmission}
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-[#79d5e9]" />
                      ) : (
                        <span className="text-xs text-white/40">Click to add</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <span className="text-xs text-white/50">
                {filteredVehicles.length} vehicles
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded text-xs bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Prev
                </button>
                <span className="text-xs text-white/70">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded text-xs bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Selected Vehicles & Summary */}
        <div className="space-y-4">
          {/* Selected Vehicles */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">
                Selected Vehicles ({selectedVehicles.length})
              </h3>
              {selectedVehicles.length > 0 && !isProcessing && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>

            {selectedVehicles.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">
                Click vehicles on the left to select them
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {selectedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2"
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
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quote Summary */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[#79d5e9]" />
              Quote Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Vehicles</span>
                <span className="text-white font-medium">{selectedVehicles.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Terms</span>
                <span className="text-white font-medium">
                  {config.terms.length > 0 ? config.terms.map(t => `${t}mo`).join(", ") : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Mileages</span>
                <span className="text-white font-medium">
                  {config.mileages.length > 0 ? config.mileages.map(m => `${m/1000}k`).join(", ") : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Contracts</span>
                <span className="text-white font-medium text-right">
                  {config.contractTypes.length > 0
                    ? config.contractTypes.map(ct =>
                        CONTRACT_TYPES.find(c => c.value === ct)?.label || ct
                      ).join(", ")
                    : "None"}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total Quotes</span>
                  <span className="text-xl font-bold text-[#79d5e9]">{totalQuotes}</span>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {selectedVehicles.length} × {config.terms.length} × {config.mileages.length} × {config.contractTypes.length} combinations
                </p>
              </div>
            </div>

            {/* Send Button */}
            {selectedVehicles.length > 0 && !isProcessing && (
              <button
                onClick={saveQueueToServer}
                disabled={totalQuotes === 0}
                className="w-full mt-4 px-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: totalQuotes > 0
                    ? "linear-gradient(135deg, #79d5e9 0%, #5bc0d8 100%)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <Play className="h-4 w-4" />
                Generate {totalQuotes} Quote{totalQuotes !== 1 ? "s" : ""}
              </button>
            )}

            {isProcessing && (
              <div className="mt-4 p-3 rounded-lg bg-[#79d5e9]/10 border border-[#79d5e9]/30">
                <div className="flex items-center gap-2 text-[#79d5e9]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Sending to queue...</span>
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              <strong>How it works:</strong> Select vehicles and configure options above.
              The system generates all term × mileage × contract combinations.
              Process the queue from the browser extension sidepanel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
