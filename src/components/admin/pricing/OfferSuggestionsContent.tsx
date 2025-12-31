"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  Plus,
  Info,
  Car,
  Truck,
  TrendingDown,
  Trophy,
  Filter,
} from "lucide-react";
import type { SmartSuggestion, SmartSuggestionsResponse } from "@/app/api/admin/offers/suggestions/route";

const REASON_COLORS: Record<string, string> = {
  exceptional_value: "#f8d824",
  market_beater: "#22c55e",
  price_drop: "#ef4444",
  popular_segment: "#a855f7",
  low_competition: "#79d5e9",
  high_margin_potential: "#f97316",
};

const REASON_LABELS: Record<string, string> = {
  exceptional_value: "Top Value",
  market_beater: "Market Beater",
  price_drop: "Price Drop",
  popular_segment: "Popular",
  low_competition: "Low Competition",
  high_margin_potential: "High Margin",
};

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
  ald: "ALD Automotive",
};

export default function OfferSuggestionsContent() {
  const [data, setData] = useState<SmartSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingCapCode, setAddingCapCode] = useState<string | null>(null);
  const [addedCapCodes, setAddedCapCodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "exceptional" | "market" | "trending">("all");
  const [vehicleType, setVehicleType] = useState<"all" | "car" | "van">("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/offers/suggestions?limit=50");
      if (!res.ok) throw new Error("Failed to fetch suggestions");

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToQueue = async (capCode: string) => {
    setAddingCapCode(capCode);

    try {
      const res = await fetch("/api/admin/deals/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", capCode }),
      });

      if (!res.ok) throw new Error("Failed to add to queue");
      setAddedCapCodes((prev) => new Set([...prev, capCode]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingCapCode(null);
    }
  };

  const getDisplaySuggestions = (): SmartSuggestion[] => {
    if (!data) return [];

    let suggestions: SmartSuggestion[];
    switch (activeTab) {
      case "exceptional":
        suggestions = data.categories.exceptionalValue;
        break;
      case "market":
        suggestions = data.categories.marketBeaters;
        break;
      case "trending":
        suggestions = data.categories.trending;
        break;
      default:
        suggestions = data.suggestions;
    }

    // Filter by vehicle type
    if (vehicleType !== "all") {
      suggestions = suggestions.filter(s => {
        const isVan = s.bodyType?.toLowerCase().includes("van") ||
                      s.model?.toLowerCase().includes("van") ||
                      s.model?.toLowerCase().includes("transit") ||
                      s.model?.toLowerCase().includes("sprinter");
        return vehicleType === "van" ? isVan : !isVan;
      });
    }

    return suggestions;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="text-red-400 text-center py-12">{error}</div>
      </div>
    );
  }

  const suggestions = getDisplaySuggestions();

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Offer Suggestions
          </h2>
          <p className="text-white/50 text-sm mt-1">
            High-value deals recommended for featuring based on score, market position, and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            {data?.metadata.totalAnalyzed || 0} rates analyzed
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {[
            { id: "all", label: "All", count: data?.suggestions.length || 0 },
            { id: "exceptional", label: "Top Value", count: data?.categories.exceptionalValue.length || 0 },
            { id: "market", label: "Market Beaters", count: data?.categories.marketBeaters.length || 0 },
            { id: "trending", label: "Trending", count: data?.categories.trending.length || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Vehicle Type Toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setVehicleType("all")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              vehicleType === "all"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setVehicleType("car")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              vehicleType === "car"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <Car className="w-4 h-4" />
            Cars
          </button>
          <button
            onClick={() => setVehicleType("van")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              vehicleType === "van"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <Truck className="w-4 h-4" />
            Vans
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <Info className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-white/50">No suggestions in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">CAP Code</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Our Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Market Avg</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Diff</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {suggestions.map((s) => {
                  const isAdded = addedCapCodes.has(s.capCode);
                  const isAdding = addingCapCode === s.capCode;
                  const primaryReason = s.reasons[0];
                  const reasonColor = REASON_COLORS[primaryReason] || "#79d5e9";

                  return (
                    <tr key={s.capCode} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {s.manufacturer} {s.model}
                        </div>
                        <div className="text-xs text-white/40">
                          {s.fuelType || "Unknown"} • {PROVIDER_NAMES[s.bestProviderCode] || s.bestProviderCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-white/60 bg-white/5 px-1.5 py-0.5 rounded">
                          {s.capCode}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-semibold">
                          £{s.monthlyPriceGbp}
                        </span>
                        <span className="text-white/40 text-xs">/mo</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.marketAvgGbp ? (
                          <span className="text-white/60">£{s.marketAvgGbp}</span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.priceDeltaPercent !== null ? (
                          <span
                            className={`font-medium ${
                              s.priceDeltaPercent < 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {s.priceDeltaPercent > 0 ? "+" : ""}{s.priceDeltaPercent}%
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="font-semibold"
                          style={{
                            color:
                              s.valueScore >= 90
                                ? "#22c55e"
                                : s.valueScore >= 80
                                ? "#f97316"
                                : s.valueScore >= 70
                                ? "#f8d824"
                                : "#ffffff",
                          }}
                        >
                          {s.valueScore}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.reasons.slice(0, 2).map((reason, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                background: `${REASON_COLORS[reason] || "#79d5e9"}20`,
                                color: REASON_COLORS[reason] || "#79d5e9",
                              }}
                            >
                              {REASON_LABELS[reason] || reason.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdded ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-green-400 bg-green-500/10">
                            <Check className="w-3.5 h-3.5" />
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddToQueue(s.capCode)}
                            disabled={isAdding}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                          >
                            {isAdding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            Add to Queue
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
