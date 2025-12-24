"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Car,
  Search,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

// Types
type Vehicle = {
  id: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  lexMakeCode: string;
  lexModelCode: string;
  lexVariantCode: string;
  co2: number | null;
  p11d: number | null;
  fuelType: string | null;
};

type BatchProgress = {
  status: string;
  currentVehicle: number;
  totalVehicles: number;
  currentCombination: number;
  totalCombinations: number;
  currentVehicleInfo?: string;
  lastQuoteNumber?: string;
  error?: string;
};

type Quote = {
  id: string;
  vehicleId: string;
  term: number;
  annualMileage: number;
  contractType: string;
  paymentPlan: string;
  otrpUsed: number | null;
  usedCustomOtr: boolean;
  quoteNumber: string | null;
  monthlyRental: number | null;
  initialRental: number | null;
  status: string;
  errorMessage: string | null;
};

type Batch = {
  batchId: string;
  status: string;
  totalCombinations: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

// Constants
const PAYMENT_PLANS = [
  { id: "1", name: "Annual in advance" },
  { id: "7", name: "Monthly in advance" },
  { id: "8", name: "Quarterly in advance" },
  { id: "9", name: "Three down terminal pause" },
  { id: "12", name: "Six down terminal pause" },
  { id: "17", name: "Nine down terminal pause" },
  { id: "23", name: "Spread Rentals with 3 down" },
  { id: "26", name: "Spread Rentals with 6 down" },
  { id: "27", name: "Spread Rentals with 12 down" },
  { id: "39", name: "No deposit benefit car plan" },
  { id: "43", name: "Spread Rentals with 9 down" },
  { id: "106", name: "Spread Rentals Initial Payment" },
];

const CONTRACT_TYPES = [
  { code: "CH", name: "Contract Hire with Maintenance" },
  { code: "CHNM", name: "Contract Hire without Maintenance" },
];

const TERMS = [24, 30, 36, 42, 48, 54, 60];
const MILEAGES = [5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000, 20000, 25000, 30000];

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "https://splitfin-broker-production.up.railway.app";
}

export default function LexPlaywrightPage() {
  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());

  // Configuration
  const [selectedTerms, setSelectedTerms] = useState<Set<number>>(new Set([36]));
  const [selectedMileages, setSelectedMileages] = useState<Set<number>>(new Set([10000]));
  const [selectedContractTypes, setSelectedContractTypes] = useState<Set<string>>(new Set(["CHNM"]));
  const [selectedPaymentPlans, setSelectedPaymentPlans] = useState<Set<string>>(new Set(["23"])); // Default: Spread 3 down
  const [useDefaultOtr, setUseDefaultOtr] = useState(true);
  const [customOtrp, setCustomOtrp] = useState<string>("");

  // Batch state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState<string | null>(null);

  // History
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedConfig, setExpandedConfig] = useState(true);

  // SSE ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load vehicles
  const loadVehicles = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/lex-playwright/vehicles?limit=500`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error("Failed to load vehicles:", err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  // Load batch history
  const loadBatches = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/lex-playwright/batches`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to load batches:", err);
    }
  };

  useEffect(() => {
    loadVehicles();
    loadBatches();
  }, []);

  // Get unique makes
  const makes = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.manufacturer))).sort();
  }, [vehicles]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        `${v.manufacturer} ${v.model} ${v.variant || ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesMake = !selectedMake || v.manufacturer === selectedMake;
      return matchesSearch && matchesMake;
    });
  }, [vehicles, searchQuery, selectedMake]);

  // Toggle functions
  const toggleVehicle = (id: string) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVehicles(newSelected);
  };

  const toggleTerm = (term: number) => {
    const newSelected = new Set(selectedTerms);
    if (newSelected.has(term)) {
      if (newSelected.size > 1) newSelected.delete(term);
    } else {
      newSelected.add(term);
    }
    setSelectedTerms(newSelected);
  };

  const toggleMileage = (mileage: number) => {
    const newSelected = new Set(selectedMileages);
    if (newSelected.has(mileage)) {
      if (newSelected.size > 1) newSelected.delete(mileage);
    } else {
      newSelected.add(mileage);
    }
    setSelectedMileages(newSelected);
  };

  const toggleContractType = (code: string) => {
    const newSelected = new Set(selectedContractTypes);
    if (newSelected.has(code)) {
      if (newSelected.size > 1) newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedContractTypes(newSelected);
  };

  const togglePaymentPlan = (id: string) => {
    const newSelected = new Set(selectedPaymentPlans);
    if (newSelected.has(id)) {
      if (newSelected.size > 1) newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPaymentPlans(newSelected);
  };

  const selectAllVehicles = () => {
    const newSelected = new Set(selectedVehicles);
    filteredVehicles.forEach((v) => newSelected.add(v.id));
    setSelectedVehicles(newSelected);
  };

  const clearVehicleSelection = () => setSelectedVehicles(new Set());

  // Calculate total combinations
  const totalCombinations = useMemo(() => {
    return (
      selectedVehicles.size *
      selectedTerms.size *
      selectedMileages.size *
      selectedContractTypes.size *
      selectedPaymentPlans.size
    );
  }, [selectedVehicles, selectedTerms, selectedMileages, selectedContractTypes, selectedPaymentPlans]);

  // Connect to SSE stream
  const connectToStream = useCallback((batchId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`${getApiBaseUrl()}/api/lex-playwright/batch/${batchId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener("progress", (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
    });

    es.addEventListener("complete", (event) => {
      const data = JSON.parse(event.data);
      setProgress({
        status: "completed",
        currentVehicle: data.totalQuotes,
        totalVehicles: data.totalQuotes,
        currentCombination: data.totalQuotes,
        totalCombinations: data.totalQuotes,
      });
      setRunning(false);
      loadBatchResults(batchId);
      es.close();
    });

    es.addEventListener("error", (event) => {
      if (event instanceof MessageEvent) {
        const data = JSON.parse(event.data);
        setError(data.error || "Stream error");
      }
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }, []);

  // Load batch results
  const loadBatchResults = async (batchId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/lex-playwright/batch/${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error("Failed to load batch results:", err);
    }
    loadBatches();
  };

  // Start batch
  const startBatch = async () => {
    if (selectedVehicles.size === 0) return;

    setRunning(true);
    setError(null);
    setProgress(null);
    setQuotes([]);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/lex-playwright/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleIds: Array.from(selectedVehicles),
          terms: Array.from(selectedTerms),
          mileages: Array.from(selectedMileages),
          contractTypes: Array.from(selectedContractTypes),
          paymentPlans: Array.from(selectedPaymentPlans),
          useDefaultOtr,
          customOtrp: !useDefaultOtr && customOtrp ? Math.round(parseFloat(customOtrp) * 100) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentBatchId(data.batchId);
        connectToStream(data.batchId);
      } else {
        setError(data.error || "Failed to start batch");
        setRunning(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setRunning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg" style={{ background: "rgba(121, 213, 233, 0.15)" }}>
            <Zap className="h-5 w-5 text-[#79d5e9]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Lex Playwright Automation</h1>
        </div>
        <p className="text-white/50">
          Automate quote generation via browser automation. Select vehicles and configuration to generate quotes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Vehicle Selection */}
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-[#79d5e9]" />
              <span className="text-sm font-medium text-white">
                Vehicles with Lex Codes ({vehicles.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAllVehicles} className="text-xs text-[#79d5e9] hover:underline">
                Select Filtered
              </button>
              <button onClick={clearVehicleSelection} className="text-xs text-white/50 hover:text-white">
                Clear
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-white/10 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder-white/30"
              />
            </div>
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white"
            >
              <option value="">All Makes</option>
              {makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#79d5e9]">
              {selectedVehicles.size} selected
            </span>
          </div>

          {/* Vehicle List */}
          <div className="max-h-96 overflow-y-auto">
            {vehiclesLoading ? (
              <div className="p-8 text-center text-white/50">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading vehicles...
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-white/50">No vehicles found</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredVehicles.slice(0, 100).map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      selectedVehicles.has(v.id) ? "bg-[#79d5e9]/10" : "hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVehicles.has(v.id)}
                      onChange={() => toggleVehicle(v.id)}
                      className="w-4 h-4 rounded border-white/20 bg-black/30 text-[#79d5e9]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {v.manufacturer} {v.model}
                      </div>
                      {v.variant && <div className="text-xs text-white/40 truncate">{v.variant}</div>}
                    </div>
                    {v.co2 && <span className="text-xs text-white/40">{v.co2}g CO2</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          {filteredVehicles.length > 100 && (
            <div className="p-2 text-center text-xs text-white/40 border-t border-white/5">
              Showing 100 of {filteredVehicles.length}
            </div>
          )}
        </div>

        {/* Right Column - Configuration */}
        <div className="space-y-4">
          {/* Config Panel */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <button
              onClick={() => setExpandedConfig(!expandedConfig)}
              className="w-full p-3 border-b border-white/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#79d5e9]" />
                <span className="text-sm font-medium text-white">Configuration</span>
              </div>
              {expandedConfig ? (
                <ChevronUp className="h-4 w-4 text-white/50" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/50" />
              )}
            </button>

            {expandedConfig && (
              <div className="p-4 space-y-4">
                {/* Contract Types */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Contract Types</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTRACT_TYPES.map((ct) => (
                      <button
                        key={ct.code}
                        onClick={() => toggleContractType(ct.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedContractTypes.has(ct.code)
                            ? "bg-[#79d5e9]/20 text-[#79d5e9] border border-[#79d5e9]/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {ct.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Terms (months)</label>
                  <div className="flex flex-wrap gap-2">
                    {TERMS.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTerm(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedTerms.has(t)
                            ? "bg-[#79d5e9]/20 text-[#79d5e9] border border-[#79d5e9]/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mileages */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Annual Mileage</label>
                  <div className="flex flex-wrap gap-2">
                    {MILEAGES.map((m) => (
                      <button
                        key={m}
                        onClick={() => toggleMileage(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedMileages.has(m)
                            ? "bg-[#79d5e9]/20 text-[#79d5e9] border border-[#79d5e9]/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {(m / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Plans */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">Payment Plans</label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_PLANS.map((pp) => (
                      <button
                        key={pp.id}
                        onClick={() => togglePaymentPlan(pp.id)}
                        title={pp.name}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selectedPaymentPlans.has(pp.id)
                            ? "bg-[#79d5e9]/20 text-[#79d5e9] border border-[#79d5e9]/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {pp.name.length > 15 ? pp.name.slice(0, 15) + "..." : pp.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OTRP Toggle */}
                <div>
                  <label className="block text-xs text-white/50 mb-2">OTR Price</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useDefaultOtr}
                        onChange={() => setUseDefaultOtr(true)}
                        className="w-4 h-4 text-[#79d5e9]"
                      />
                      <span className="text-sm text-white">Use Lex default OTR</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useDefaultOtr}
                        onChange={() => setUseDefaultOtr(false)}
                        className="w-4 h-4 text-[#79d5e9]"
                      />
                      <span className="text-sm text-white">Custom OTR (Bonus excluded)</span>
                    </label>
                    {!useDefaultOtr && (
                      <input
                        type="number"
                        placeholder="Enter custom OTR (£)"
                        value={customOtrp}
                        onChange={(e) => setCustomOtrp(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white placeholder-white/30 mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary & Run Button */}
          <div
            className="rounded-xl border p-4"
            style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <div className="text-sm text-white/70 mb-3">
              <div className="flex justify-between mb-1">
                <span>Vehicles:</span>
                <span className="text-white">{selectedVehicles.size}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Combinations per vehicle:</span>
                <span className="text-white">
                  {selectedTerms.size * selectedMileages.size * selectedContractTypes.size * selectedPaymentPlans.size}
                </span>
              </div>
              <div className="flex justify-between text-[#79d5e9] font-medium">
                <span>Total quotes:</span>
                <span>{totalCombinations.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={startBatch}
              disabled={selectedVehicles.size === 0 || running}
              className="w-full py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)",
                color: "#0f1419",
              }}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Batch ({totalCombinations} quotes)
                </>
              )}
            </button>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-3 rounded-xl border text-sm text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(26, 31, 42, 0.4)", borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Recent Batches</span>
            </div>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showHistory && batches.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                {batches.slice(0, 10).map((b) => (
                  <div
                    key={b.batchId}
                    onClick={() => loadBatchResults(b.batchId)}
                    className="p-3 hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-white/40">
                        {b.batchId.slice(0, 8)}...
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          b.status === "completed"
                            ? "bg-green-500/20 text-green-400"
                            : b.status === "failed"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div className="text-xs text-white/50">
                      {b.successCount}/{b.totalCombinations} quotes •{" "}
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Display */}
      {(running || progress) && (
        <div
          className="mt-4 rounded-xl border p-4"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            {running ? (
              <Loader2 className="h-5 w-5 text-[#79d5e9] animate-spin" />
            ) : progress?.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : progress?.status === "error" ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : null}
            <span className="text-sm font-medium text-white">
              {progress?.status === "completed"
                ? "Batch Complete"
                : progress?.status === "error"
                ? "Batch Failed"
                : `Processing... ${progress?.currentCombination || 0}/${progress?.totalCombinations || 0}`}
            </span>
            {progress?.lastQuoteNumber && (
              <span className="text-xs text-white/40">Last quote: {progress.lastQuoteNumber}</span>
            )}
          </div>

          {progress && progress.totalCombinations > 0 && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#79d5e9] transition-all duration-300"
                style={{
                  width: `${(progress.currentCombination / progress.totalCombinations) * 100}%`,
                }}
              />
            </div>
          )}

          {progress?.currentVehicleInfo && (
            <p className="text-xs text-white/50 mt-2">Current: {progress.currentVehicleInfo}</p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="mt-4 p-4 rounded-xl border flex items-center gap-3"
          style={{ background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Results Table */}
      {quotes.length > 0 && (
        <div
          className="mt-4 rounded-xl border overflow-hidden"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              Results: {quotes.filter((q) => q.status === "success").length}/{quotes.length} successful
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-white/50 border-b border-white/10">
                  <th className="text-left px-4 py-2">Quote #</th>
                  <th className="text-left px-4 py-2">Term</th>
                  <th className="text-left px-4 py-2">Mileage</th>
                  <th className="text-left px-4 py-2">Contract</th>
                  <th className="text-left px-4 py-2">Plan</th>
                  <th className="text-right px-4 py-2">Monthly</th>
                  <th className="text-right px-4 py-2">Initial</th>
                  <th className="text-center px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {quotes.slice(0, 50).map((q, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-4 py-2 text-sm font-mono text-white/80">
                      {q.quoteNumber || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-white/60">{q.term}m</td>
                    <td className="px-4 py-2 text-sm text-white/60">
                      {(q.annualMileage / 1000).toFixed(0)}k
                    </td>
                    <td className="px-4 py-2 text-sm text-white/60">{q.contractType}</td>
                    <td className="px-4 py-2 text-sm text-white/60">
                      {PAYMENT_PLANS.find((p) => p.id === q.paymentPlan)?.name.slice(0, 15) || q.paymentPlan}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-green-400">
                      {q.monthlyRental ? `£${(q.monthlyRental / 100).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-white/60">
                      {q.initialRental ? `£${(q.initialRental / 100).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {q.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <span title={q.errorMessage || "Error"}>
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quotes.length > 50 && (
            <div className="p-2 text-center text-xs text-white/40 border-t border-white/5">
              Showing 50 of {quotes.length} results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
