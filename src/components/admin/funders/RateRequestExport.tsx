"use client";

import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Filter,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { RateRequestExport } from "@/app/api/admin/funders/rate-request/route";

interface RateRequestExportProps {
  className?: string;
}

const PROVIDERS = [
  { code: "lex", name: "Lex Autolease" },
  { code: "ogilvie", name: "Ogilvie Fleet" },
  { code: "venus", name: "Venus" },
  { code: "drivalia", name: "Drivalia" },
];

const FUEL_TYPES = [
  "Petrol",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plug-in Hybrid",
];

export function RateRequestExport({ className = "" }: RateRequestExportProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [manufacturer, setManufacturer] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [minP11d, setMinP11d] = useState("");
  const [maxP11d, setMaxP11d] = useState("");
  const [limit, setLimit] = useState("100");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RateRequestExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!selectedProvider) {
      setError("Please select a funder");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const params = new URLSearchParams();
      params.set("provider", selectedProvider);
      if (manufacturer) params.set("manufacturer", manufacturer);
      if (fuelType) params.set("fuelType", fuelType);
      if (minP11d) params.set("minP11d", minP11d);
      if (maxP11d) params.set("maxP11d", maxP11d);
      params.set("limit", limit);

      const res = await fetch(`/api/admin/funders/rate-request?${params}`);
      if (!res.ok) throw new Error("Failed to generate preview");

      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedProvider) return;

    const params = new URLSearchParams();
    params.set("provider", selectedProvider);
    params.set("format", "csv");
    if (manufacturer) params.set("manufacturer", manufacturer);
    if (fuelType) params.set("fuelType", fuelType);
    if (minP11d) params.set("minP11d", minP11d);
    if (maxP11d) params.set("maxP11d", maxP11d);
    params.set("limit", limit);

    window.location.href = `/api/admin/funders/rate-request?${params}`;
  };

  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-white text-sm">Rate Request Generator</h3>
        <span className="text-xs text-white/50">
          Export vehicles missing from a funder
        </span>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-4 border-b border-white/10">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm text-white/60 mb-2">Target Funder *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.code}
                type="button"
                onClick={() => setSelectedProvider(provider.code)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedProvider === provider.code
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">Manufacturer</label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g., BMW"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Fuel Type</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="" className="bg-[#1a1f2a]">All</option>
              {FUEL_TYPES.map((ft) => (
                <option key={ft} value={ft} className="bg-[#1a1f2a]">
                  {ft}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Min P11D (£)</label>
            <input
              type="number"
              value={minP11d}
              onChange={(e) => setMinP11d(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Max P11D (£)</label>
            <input
              type="number"
              value={maxP11d}
              onChange={(e) => setMaxP11d(e.target.value)}
              placeholder="100000"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="50" className="bg-[#1a1f2a]">50 vehicles</option>
              <option value="100" className="bg-[#1a1f2a]">100 vehicles</option>
              <option value="200" className="bg-[#1a1f2a]">200 vehicles</option>
              <option value="500" className="bg-[#1a1f2a]">500 vehicles</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={loading || !selectedProvider}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/80 hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Filter className="w-4 h-4" />
            )}
            Preview
          </button>

          <button
            onClick={handleDownload}
            disabled={!selectedProvider}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Preview Results */}
      {preview && (
        <div className="p-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-white">
                {preview.summary.totalVehicles}
              </div>
              <div className="text-xs text-white/50">Vehicles Found</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-white">
                {Object.keys(preview.summary.byManufacturer).length}
              </div>
              <div className="text-xs text-white/50">Manufacturers</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-white">
                £{preview.summary.avgP11d.toLocaleString()}
              </div>
              <div className="text-xs text-white/50">Avg P11D</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <div className="text-2xl font-bold text-cyan-400">
                {preview.metadata.targetProvider}
              </div>
              <div className="text-xs text-white/50">Target Funder</div>
            </div>
          </div>

          {/* Manufacturer Breakdown */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-white/50 uppercase mb-2">
              By Manufacturer
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.summary.byManufacturer)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([mfr, count]) => (
                  <span
                    key={mfr}
                    className="px-2 py-1 rounded bg-white/5 text-xs text-white/70"
                  >
                    {mfr}: {count}
                  </span>
                ))}
            </div>
          </div>

          {/* Sample Vehicles */}
          <div>
            <h4 className="text-xs font-medium text-white/50 uppercase mb-2">
              Sample Vehicles ({Math.min(5, preview.vehicles.length)} of {preview.vehicles.length})
            </h4>
            <div className="space-y-2">
              {preview.vehicles.slice(0, 5).map((v) => (
                <div
                  key={v.capCode}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {v.manufacturer} {v.model}
                    </div>
                    <div className="text-xs text-white/40">
                      {v.capCode} • {v.fuelType || "Unknown"} • P11D: £{v.p11dGbp.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {v.bestCurrentPriceGbp ? (
                      <div className="text-sm text-green-400">
                        £{v.bestCurrentPriceGbp}/mo
                      </div>
                    ) : (
                      <div className="text-xs text-white/30">No current rates</div>
                    )}
                    <div className="text-xs text-white/40">
                      {v.currentProviders.length > 0
                        ? `Has: ${v.currentProviders.join(", ")}`
                        : "No coverage"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
