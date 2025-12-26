"use client";

import { useState, useEffect } from "react";

// Declare chrome extension API for TypeScript
declare const chrome: {
  runtime: {
    sendMessage: (
      message: Record<string, unknown>,
      callback: (response: Record<string, unknown>) => void
    ) => void;
  };
} | undefined;
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
    monthlyRentalIncVat?: number;
    initialRental?: number;
    quoteId?: string;
  };
  error?: string;
};

type PortalStatus = {
  ready: boolean;
  tabId?: number;
};

const TERMS = [24, 36, 48, 60];
const MILEAGES = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const CONTRACT_TYPES = [
  { value: "BCH", label: "Business Contract Hire" },
  { value: "BCHNM", label: "BCH (No Maintenance)" },
  { value: "PCH", label: "Personal Contract Hire" },
];

export function DrivaliaQuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  const [portalStatus, setPortalStatus] = useState<PortalStatus>({ ready: false });
  const [statusLoading, setStatusLoading] = useState(true);

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
    contractType: "BCH",
  });

  // Queue
  const [queue, setQueue] = useState<QueuedVehicle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if Drivalia portal is open via extension
  const checkPortalStatus = async () => {
    setStatusLoading(true);
    try {
      // Try to communicate with the extension
      if (typeof chrome !== "undefined" && chrome?.runtime) {
        chrome.runtime.sendMessage(
          { action: "detectProvider" },
          (response) => {
            const res = response as { drivalia?: boolean; drivaliaTabId?: number } | undefined;
            if (res?.drivalia) {
              setPortalStatus({ ready: true, tabId: res.drivaliaTabId });
            } else {
              setPortalStatus({ ready: false });
            }
            setStatusLoading(false);
          }
        );
      } else {
        // Extension not available
        setPortalStatus({ ready: false });
        setStatusLoading(false);
      }
    } catch {
      setPortalStatus({ ready: false });
      setStatusLoading(false);
    }
  };

  // Fetch vehicles with CAP codes
  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMake) params.set("make", selectedMake);

      const response = await fetch(`/api/vehicles?${params}`);
      const data = await response.json();

      // Filter to only vehicles with CAP codes
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
    checkPortalStatus();
    // Poll for portal status every 5 seconds
    const interval = setInterval(checkPortalStatus, 5000);
    return () => clearInterval(interval);
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

  // Add vehicle to queue
  const addToQueue = (vehicle: Vehicle) => {
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

  // Open Drivalia portal
  const openPortal = () => {
    window.open(
      "https://www.caafgenus3.co.uk/WebApp/fmoportal/index.html#/quoting/new",
      "_blank"
    );
  };

  // Run quotes via extension
  const runQuotes = async () => {
    if (!portalStatus.ready) {
      alert("Please open the Drivalia portal first");
      return;
    }

    setIsProcessing(true);

    // Process each vehicle in the queue
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "pending") continue;

      // Update status to running
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "running" as const } : q))
      );

      try {
        // Check extension is available
        if (typeof chrome === "undefined" || !chrome?.runtime) {
          throw new Error("Extension not available");
        }

        // Send message to extension to run the quote
        const result = await new Promise<{
          success: boolean;
          monthlyRental?: number;
          monthlyRentalIncVat?: number;
          initialRental?: number;
          quoteId?: string;
          error?: string;
        }>((resolve) => {
          chrome!.runtime.sendMessage(
            {
              action: "runDrivaliaQuote",
              data: {
                capCode: item.capCode,
                term: item.config.term,
                mileage: item.config.mileage,
                contractType: item.config.contractType,
              },
            },
            (response) => {
              const res = response as { success: boolean; monthlyRental?: number; monthlyRentalIncVat?: number; initialRental?: number; quoteId?: string; error?: string } | undefined;
              resolve(res ?? { success: false, error: "No response from extension" });
            }
          );
        });

        if (result.success) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: "complete" as const,
                    result: {
                      monthlyRental: result.monthlyRental,
                      monthlyRentalIncVat: result.monthlyRentalIncVat,
                      initialRental: result.initialRental,
                      quoteId: result.quoteId,
                    },
                  }
                : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "error" as const, error: result.error }
                : q
            )
          );
        }
      } catch (error) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : q
          )
        );
      }

      // Wait a bit between quotes
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
    onQuotesComplete?.();
  };

  if (statusLoading) {
    return (
      <div className="p-8 text-center text-white/50">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Checking portal status...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portal Status */}
      <div
        className={`p-4 rounded-xl border ${
          portalStatus.ready
            ? "bg-green-500/10 border-green-500/30"
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}
      >
        <div className="flex items-center gap-3">
          {portalStatus.ready ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <span className="text-green-400 font-medium">Drivalia Portal Connected</span>
                <span className="text-white/50 ml-2 text-sm">
                  Extension detected an open portal tab
                </span>
              </div>
              <button
                onClick={checkPortalStatus}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-white/50" />
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <span className="text-yellow-400">Portal Not Detected</span>
                <span className="text-white/50 ml-2 text-sm">
                  Open the Drivalia portal and login
                </span>
              </div>
              <button
                onClick={openPortal}
                className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-sm hover:bg-pink-500/30 transition-colors flex items-center gap-1"
              >
                Open Portal <ExternalLink className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {!portalStatus.ready ? (
        /* Extension Instructions */
        <div
          className="p-6 rounded-xl border"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: "rgba(236, 72, 153, 0.15)" }}>
              <Chrome className="h-6 w-6 text-pink-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Browser Extension Required
              </h3>
              <p className="text-sm text-white/60 mb-4">
                Install the Chrome extension and open the Drivalia portal to run automated quotes.
              </p>
              <div className="space-y-2">
                <button
                  onClick={openPortal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
                >
                  Open Drivalia Portal <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Quote Runner UI */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Vehicle Picker */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Car className="h-4 w-4 text-pink-400" />
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
                  placeholder="Search by name or CAP code..."
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
                  No vehicles with CAP codes found
                </div>
              ) : (
                paginatedVehicles.map((vehicle) => {
                  const inQueue = queue.some((q) => q.id === vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        inQueue
                          ? "bg-pink-500/10 border-pink-500/30"
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
                            {vehicle.variant} | {vehicle.fuelType} | {vehicle.transmission}
                          </div>
                          <div className="text-xs text-pink-400/70 mt-1 font-mono">
                            {vehicle.capCode}
                          </div>
                        </div>
                        {inQueue ? (
                          <CheckCircle2 className="h-4 w-4 text-pink-400" />
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded text-xs bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-white/70">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
                {queue.length > 0 && !isProcessing && (
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
                          {item.config.term}mo | {item.config.mileage.toLocaleString()}mi | {item.config.contractType}
                        </div>
                      </div>

                      {item.status === "pending" && !isProcessing && (
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4 text-white/40" />
                        </button>
                      )}

                      {item.status === "running" && (
                        <Loader2 className="h-4 w-4 text-pink-400 animate-spin" />
                      )}

                      {item.status === "complete" && item.result && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-400">
                            £{item.result.monthlyRental?.toFixed(2)}/mo
                          </div>
                        </div>
                      )}

                      {item.status === "error" && (
                        <div className="flex items-center gap-1" title={item.error}>
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Run Button */}
              {queue.length > 0 && !isProcessing && (
                <button
                  onClick={runQuotes}
                  disabled={!portalStatus.ready}
                  className="w-full mt-4 px-4 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  }}
                >
                  <Play className="h-4 w-4" />
                  Run {queue.length} Quote{queue.length > 1 ? "s" : ""}
                </button>
              )}

              {isProcessing && (
                <div className="mt-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
                  <div className="flex items-center gap-2 text-pink-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      Processing quotes... Keep the Drivalia portal open.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
              <p className="text-sm text-pink-300">
                <strong>How it works:</strong> Select vehicles, configure quote settings, then click Run.
                The extension will automate the Drivalia portal to generate quotes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
