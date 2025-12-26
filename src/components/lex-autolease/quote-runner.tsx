"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Chrome,
  ExternalLink,
  Search,
  Car,
  Play,
  Trash2,
  RefreshCw,
} from "lucide-react";

type SessionInfo = {
  hasValidSession: boolean;
  username?: string;
  expiresAt?: string;
};

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
  term: number;
  mileage: number;
  contractType: string;
};

type QueuedVehicle = Vehicle & {
  config: QuoteConfig;
  status: "pending" | "running" | "complete" | "error";
  result?: {
    monthlyRental?: number;
    initialRental?: number;
    quoteId?: string;
  };
  error?: string;
};

const TERMS = [24, 36, 48, 60];
const MILEAGES = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const CONTRACT_TYPES = [
  { value: "contract_hire_without_maintenance", label: "CH (No Maint)" },
  { value: "contract_hire_with_maintenance", label: "CH (With Maint)" },
  { value: "personal_contract_hire", label: "PCH" },
];

export function QuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Vehicle search
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Quote configuration
  const [config, setConfig] = useState<QuoteConfig>({
    term: 36,
    mileage: 10000,
    contractType: "contract_hire_without_maintenance",
  });

  // Queue
  const [queue, setQueue] = useState<QueuedVehicle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check session status
  const checkSession = async () => {
    try {
      const response = await fetch("/api/lex-autolease/session");
      const data = await response.json();
      setSession(data);
    } catch (error) {
      console.error("Session check failed:", error);
      setSession({ hasValidSession: false });
    } finally {
      setSessionLoading(false);
    }
  };

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
    checkSession();
  }, []);

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

  // Add vehicle to queue
  const addToQueue = (vehicle: Vehicle) => {
    // Check if already in queue
    if (queue.some((q) => q.id === vehicle.id)) return;

    setQueue([
      ...queue,
      {
        ...vehicle,
        config: { ...config },
        status: "pending",
      },
    ]);
  };

  // Remove from queue
  const removeFromQueue = (vehicleId: string) => {
    setQueue(queue.filter((q) => q.id !== vehicleId));
  };

  // Clear queue
  const clearQueue = () => {
    setQueue([]);
  };

  // Save queue to server for extension to process
  const saveQueueToServer = async () => {
    try {
      const response = await fetch("/api/lex-autolease/quote-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: queue.map((v) => ({
            vehicleId: v.id,
            capCode: v.cap_code,
            manufacturer: v.manufacturer,
            model: v.model,
            variant: v.variant,
            lexMakeCode: v.lex_make_code,
            lexModelCode: v.lex_model_code,
            lexVariantCode: v.lex_variant_code,
            term: v.config.term,
            mileage: v.config.mileage,
            contractType: v.config.contractType,
            co2: v.co2,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsProcessing(true);
        return data.queueId;
      }
    } catch (error) {
      console.error("Failed to save queue:", error);
    }
  };

  // Check queue status
  const checkQueueStatus = async () => {
    try {
      const response = await fetch("/api/lex-autolease/quote-queue");
      const data = await response.json();

      if (data.queue) {
        // Update queue with results
        setQueue((prev) =>
          prev.map((item) => {
            const serverItem = data.queue.find(
              (q: { vehicleId: string }) => q.vehicleId === item.id
            );
            if (serverItem) {
              return {
                ...item,
                status: serverItem.status,
                result: serverItem.result,
                error: serverItem.error,
              };
            }
            return item;
          })
        );

        // Check if all complete
        const allComplete = data.queue.every(
          (q: { status: string }) => q.status === "complete" || q.status === "error"
        );
        if (allComplete) {
          setIsProcessing(false);
          onQuotesComplete?.();
        }
      }
    } catch (error) {
      console.error("Failed to check queue:", error);
    }
  };

  // Poll for updates when processing
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(checkQueueStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  if (sessionLoading) {
    return (
      <div className="p-8 text-center text-white/50">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading...
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
              Select vehicles below, then click &quot;Run Quotes&quot;. Process the queue from the browser extension sidepanel.
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

      {/* Always show Quote Runner UI - extension handles session */}
      {(
        /* Quote Runner UI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Vehicle Picker */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Car className="h-4 w-4 text-[#79d5e9]" />
              Select Vehicles
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
                  const inQueue = queue.some((q) => q.id === vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        inQueue
                          ? "bg-[#79d5e9]/10 border-[#79d5e9]/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                      onClick={() => !inQueue && addToQueue(vehicle)}
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
                        {inQueue ? (
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

          {/* Right: Quote Config & Queue */}
          <div className="space-y-4">
            {/* Quote Configuration */}
            <div
              className="rounded-xl border p-4"
              style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <h3 className="text-white font-medium mb-4">Quote Configuration</h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Term</label>
                  <select
                    value={config.term}
                    onChange={(e) => setConfig({ ...config, term: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1f2a] border border-white/10 text-white [&>option]:bg-[#1a1f2a] [&>option]:text-white"
                  >
                    {TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t} months
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Annual Mileage</label>
                  <select
                    value={config.mileage}
                    onChange={(e) => setConfig({ ...config, mileage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1f2a] border border-white/10 text-white [&>option]:bg-[#1a1f2a] [&>option]:text-white"
                  >
                    {MILEAGES.map((m) => (
                      <option key={m} value={m}>
                        {m.toLocaleString()} mi
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Contract</label>
                  <select
                    value={config.contractType}
                    onChange={(e) => setConfig({ ...config, contractType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1f2a] border border-white/10 text-white [&>option]:bg-[#1a1f2a] [&>option]:text-white"
                  >
                    {CONTRACT_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Queue */}
            <div
              className="rounded-xl border p-4"
              style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Quote Queue ({queue.length})</h3>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  Select vehicles to add to queue
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {item.manufacturer} {item.model}
                        </div>
                        <div className="text-xs text-white/50">
                          {item.config.term}mo • {item.config.mileage.toLocaleString()}mi
                        </div>
                      </div>

                      {item.status === "pending" && (
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4 text-white/40" />
                        </button>
                      )}

                      {item.status === "running" && (
                        <Loader2 className="h-4 w-4 text-[#79d5e9] animate-spin" />
                      )}

                      {item.status === "complete" && item.result && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-400">
                            £{item.result.monthlyRental?.toFixed(2)}/mo
                          </div>
                        </div>
                      )}

                      {item.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Run Button */}
              {queue.length > 0 && !isProcessing && (
                <button
                  onClick={saveQueueToServer}
                  className="w-full mt-4 px-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #79d5e9 0%, #5bc0d8 100%)",
                  }}
                >
                  <Play className="h-4 w-4" />
                  Run {queue.length} Quote{queue.length > 1 ? "s" : ""} via Extension
                </button>
              )}

              {isProcessing && (
                <div className="mt-4 p-3 rounded-lg bg-[#79d5e9]/10 border border-[#79d5e9]/30">
                  <div className="flex items-center gap-2 text-[#79d5e9]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      Processing quotes... Open the extension to run them.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Extension Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-300">
                <strong>How it works:</strong> Click &quot;Run Quotes&quot; to queue vehicles,
                then open the Chrome extension and click &quot;Process Queue&quot; to fetch quotes
                from your browser.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
