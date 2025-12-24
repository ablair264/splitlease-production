"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Play, Loader2, CheckCircle2, XCircle, User, LogOut } from "lucide-react";

type VehicleRaw = {
  id: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  cap_code: string | null;
  lex_make_code: string | null;
  lex_model_code: string | null;
  lex_variant_code: string | null;
};

type Vehicle = {
  id: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  capCode: string | null;
  lexMakeCode: string | null;
  lexModelCode: string | null;
  lexVariantCode: string | null;
};

type QuoteResult = {
  vehicle: { make: string; model: string; variant: string };
  success: boolean;
  monthlyRental?: number;
  monthlyRentalIncVat?: number;
  initialRental?: number;
  otrp?: number;
  brokerOtrp?: number;
  usedFleetDiscount?: boolean;
  fleetSavingsPercent?: number;
  error?: string;
};

type SessionInfo = {
  hasValidSession: boolean;
  username?: string;
  expiresAt?: string;
};

const TERMS = [24, 30, 36, 42, 48, 54, 60];
const MILEAGES = [5000, 6000, 7000, 8000, 9000, 10000, 12000, 15000, 20000, 25000, 30000];

// Payment plans - verified from Lex API
const PAYMENT_PLANS = [
  { id: "monthly_in_advance", label: "Monthly in Advance" },
  { id: "quarterly_in_advance", label: "Quarterly in Advance" },
  { id: "annual_in_advance", label: "Annual in Advance" },
  { id: "spread_3_down", label: "3 Months Upfront (Spread)" },
  { id: "spread_6_down", label: "6 Months Upfront (Spread)" },
  { id: "spread_12_down", label: "12 Months Upfront (Spread)" },
  { id: "three_down_terminal_pause", label: "3 Down Terminal Pause" },
  { id: "six_down_terminal_pause", label: "6 Down Terminal Pause" },
  { id: "nine_down_terminal_pause", label: "9 Down Terminal Pause" },
];

// Contract types - verified from Lex API
const CONTRACT_TYPES = [
  { id: "contract_hire_without_maintenance", label: "Contract Hire (No Maint)", shortLabel: "CHNM" },
  { id: "contract_hire_with_maintenance", label: "Contract Hire + Maintenance", shortLabel: "CHM" },
  { id: "personal_contract_hire", label: "Personal Contract Hire", shortLabel: "PCH" },
  { id: "personal_contract_hire_without_maint", label: "Personal CH (No Maint)", shortLabel: "PCHNM" },
  { id: "salary_sacrifice", label: "Salary Sacrifice", shortLabel: "SSC" },
];

export function QuoteRunner({ onQuotesComplete }: { onQuotesComplete?: () => void }) {
  // Session state
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());

  // Quote parameters
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);
  const [contractType, setContractType] = useState("contract_hire_without_maintenance");
  const [paymentPlan, setPaymentPlan] = useState("spread_3_down"); // Default to 3 months upfront

  // Running state
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<QuoteResult[]>([]);

  // Check session status
  const checkSession = async () => {
    try {
      const response = await fetch("/api/lex-autolease/session");
      const data = await response.json();
      setSession(data);
    } catch {
      setSession({ hasValidSession: false });
    } finally {
      setSessionLoading(false);
    }
  };

  // Load vehicles
  const loadVehicles = async () => {
    try {
      const response = await fetch("/api/lex-autolease/vehicles?hasLexCodes=true");
      if (response.ok) {
        const data = await response.json();
        const transformed: Vehicle[] = (data.vehicles || []).map((v: VehicleRaw) => ({
          id: v.id,
          manufacturer: v.manufacturer,
          model: v.model,
          variant: v.variant,
          capCode: v.cap_code,
          lexMakeCode: v.lex_make_code,
          lexModelCode: v.lex_model_code,
          lexVariantCode: v.lex_variant_code,
        }));
        setVehicles(transformed);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
    loadVehicles();
  }, []);

  // Login handler
  const handleLogin = async () => {
    if (!email || !password) return;

    setLoggingIn(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/lex-autolease/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setPassword(""); // Clear password
        checkSession();
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error");
    } finally {
      setLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch("/api/lex-autolease/session", { method: "DELETE" });
    checkSession();
  };

  // Get unique makes
  const makes = useMemo(() => {
    return Array.from(new Set(vehicles.map((v) => v.manufacturer))).sort();
  }, [vehicles]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch = !searchQuery ||
        `${v.manufacturer} ${v.model} ${v.variant || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMake = !selectedMake || v.manufacturer === selectedMake;
      return matchesSearch && matchesMake;
    });
  }, [vehicles, searchQuery, selectedMake]);

  // Toggle vehicle selection
  const toggleVehicle = (id: string) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVehicles(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set(selectedVehicles);
    filteredVehicles.forEach((v) => newSelected.add(v.id));
    setSelectedVehicles(newSelected);
  };

  const clearSelection = () => setSelectedVehicles(new Set());

  // Get selected vehicle data
  const selectedVehicleData = useMemo(() => {
    return vehicles.filter((v) => selectedVehicles.has(v.id));
  }, [vehicles, selectedVehicles]);

  // Run quotes
  const runQuotes = async () => {
    if (selectedVehicleData.length === 0) return;

    setRunning(true);
    setResults([]);

    try {
      const vehiclesToQuote = selectedVehicleData.map((v) => ({
        makeCode: v.lexMakeCode!,
        modelCode: v.lexModelCode!,
        variantCode: v.lexVariantCode!,
        make: v.manufacturer,
        model: v.model,
        variant: v.variant || "",
        capCode: v.capCode,
        vehicleId: v.id,
      }));

      const response = await fetch("/api/lex-autolease/run-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles: vehiclesToQuote, term, mileage, paymentPlan, contractType }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        onQuotesComplete?.();
      } else if (data.requiresSession) {
        setSession({ hasValidSession: false });
      } else {
        setResults([{ vehicle: { make: "", model: "", variant: "" }, success: false, error: data.error }]);
      }
    } catch (error) {
      setResults([{
        vehicle: { make: "", model: "", variant: "" },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }]);
    } finally {
      setRunning(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="p-8 text-center text-white/50">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        Checking session...
      </div>
    );
  }

  // Show login form if not authenticated
  if (!session?.hasValidSession) {
    return (
      <div
        className="max-w-md mx-auto p-6 rounded-xl border"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ background: "rgba(121, 213, 233, 0.15)" }}>
            <User className="h-5 w-5 text-[#79d5e9]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Lex Autolease Login</h3>
            <p className="text-xs text-white/50">Enter your portal credentials</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/70 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
              style={{ background: "rgba(15, 20, 25, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
              style={{ background: "rgba(15, 20, 25, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
            />
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{loginError}</p>
              <p className="text-xs text-white/50 mt-1">
                Automated login may be blocked by bot protection.
              </p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email || !password || loggingIn}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)", color: "#0f1419" }}
          >
            {loggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>

          <div className="text-center pt-2 border-t border-white/10 mt-4">
            <p className="text-xs text-white/40 mb-2">Having trouble logging in?</p>
            <a
              href="/admin/lex-session"
              className="text-sm text-[#79d5e9] hover:underline"
            >
              Capture session manually from browser
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Main quote runner UI
  return (
    <div className="space-y-4">
      {/* Session Status Bar */}
      <div
        className="px-4 py-3 rounded-xl border flex items-center justify-between"
        style={{ background: "rgba(34, 197, 94, 0.1)", borderColor: "rgba(34, 197, 94, 0.3)" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-400">
            Logged in as {session.username}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-white/50 hover:text-white flex items-center gap-1"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>

      {/* Quote Parameters */}
      <div
        className="p-4 rounded-xl border"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-white/50 mb-1">Contract Type</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white min-w-[180px]"
            >
              {CONTRACT_TYPES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white"
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>{t} months</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Annual Mileage</label>
            <select
              value={mileage}
              onChange={(e) => setMileage(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white"
            >
              {MILEAGES.map((m) => (
                <option key={m} value={m}>{m.toLocaleString()} miles</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Payment Plan</label>
            <select
              value={paymentPlan}
              onChange={(e) => setPaymentPlan(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-black/30 border border-white/10 text-white min-w-[180px]"
            >
              {PAYMENT_PLANS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={runQuotes}
            disabled={selectedVehicles.size === 0 || running}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[#79d5e9] text-[#0f1419] hover:bg-[#5bc4dc] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Quotes ({selectedVehicles.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Vehicle Selection */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
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
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={selectAll} className="text-xs text-[#79d5e9] hover:underline">Select All</button>
          <button onClick={clearSelection} className="text-xs text-white/50 hover:text-white">Clear</button>
        </div>

        {/* Vehicle List */}
        <div className="max-h-64 overflow-y-auto">
          {vehiclesLoading ? (
            <div className="p-8 text-center text-white/50">Loading...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-white/50">No vehicles with Lex codes found</div>
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
                    {v.variant && (
                      <div className="text-xs text-white/40 truncate">{v.variant}</div>
                    )}
                  </div>
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

      {/* Results */}
      {results.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              Results: {results.filter((r) => r.success).length}/{results.length} successful
            </span>
            <span className="text-xs text-white/40">
              Prices shown: ex VAT / inc VAT
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white block truncate">
                    {r.vehicle.make} {r.vehicle.model}
                  </span>
                  {r.vehicle.variant && (
                    <span className="text-xs text-white/40 block truncate">{r.vehicle.variant}</span>
                  )}
                </div>
                {r.success ? (
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm font-medium text-green-400">
                        £{r.monthlyRental?.toFixed(2)} <span className="text-white/40">/</span> £{r.monthlyRentalIncVat?.toFixed(2)}
                      </span>
                      {r.usedFleetDiscount && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#79d5e9]/20 text-[#79d5e9] rounded">
                          FLEET
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">
                      {r.usedFleetDiscount && r.brokerOtrp ? (
                        <>
                          OTR: <span className="line-through">£{r.otrp?.toLocaleString()}</span>{" "}
                          <span className="text-[#79d5e9]">£{r.brokerOtrp.toLocaleString()}</span>
                          {r.fleetSavingsPercent && (
                            <span className="text-[#79d5e9]"> ({r.fleetSavingsPercent}% off)</span>
                          )}
                        </>
                      ) : r.otrp ? (
                        <>OTR: £{r.otrp.toLocaleString()}</>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-red-400 flex-shrink-0">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
