"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
  Target,
  Loader2,
  RefreshCw,
  Check,
  Plus,
  Info,
} from "lucide-react";
import type { SmartSuggestion, SmartSuggestionsResponse } from "@/app/api/admin/offers/suggestions/route";

interface SmartSuggestionsProps {
  className?: string;
  onAddToQueue?: (capCode: string) => void;
}

const REASON_COLORS: Record<string, string> = {
  exceptional_value: "#f8d824",
  market_beater: "#22c55e",
  price_drop: "#ef4444",
  popular_segment: "#a855f7",
  low_competition: "#79d5e9",
  high_margin_potential: "#f97316",
};

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex",
  ogilvie: "Ogilvie",
  venus: "Venus",
  drivalia: "Drivalia",
};

export function SmartSuggestions({ className = "", onAddToQueue }: SmartSuggestionsProps) {
  const [data, setData] = useState<SmartSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingCapCode, setAddingCapCode] = useState<string | null>(null);
  const [addedCapCodes, setAddedCapCodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "exceptional" | "market" | "trending">("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/offers/suggestions?limit=12");
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

      // Mark as added locally
      setAddedCapCodes((prev) => new Set([...prev, capCode]));

      if (onAddToQueue) {
        onAddToQueue(capCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingCapCode(null);
    }
  };

  const getDisplaySuggestions = (): SmartSuggestion[] => {
    if (!data) return [];

    switch (activeTab) {
      case "exceptional":
        return data.categories.exceptionalValue;
      case "market":
        return data.categories.marketBeaters;
      case "trending":
        return data.categories.trending;
      default:
        return data.suggestions;
    }
  };

  if (loading && !data) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`text-red-400 text-center py-6 ${className}`}>{error}</div>
    );
  }

  const suggestions = getDisplaySuggestions();

  return (
    <div className={className}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All", count: data?.suggestions.length || 0 },
              { id: "exceptional", label: "Top Value", count: data?.categories.exceptionalValue.length || 0 },
              { id: "market", label: "Market Beaters", count: data?.categories.marketBeaters.length || 0 },
              { id: "trending", label: "Trending", count: data?.categories.trending.length || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
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
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {data?.metadata.totalAnalyzed || 0} analyzed
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Compact Table */}
      {suggestions.length === 0 ? (
        <div className="text-center py-6">
          <Info className="w-6 h-6 text-white/30 mx-auto mb-2" />
          <p className="text-white/50 text-sm">No suggestions in this category</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/50 border-b border-white/10">
                <th className="pb-2 font-medium">Vehicle</th>
                <th className="pb-2 font-medium text-right">Price</th>
                <th className="pb-2 font-medium text-right">Market</th>
                <th className="pb-2 font-medium text-right">Score</th>
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium text-right w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {suggestions.map((s) => {
                const isAdded = addedCapCodes.has(s.capCode);
                const isAdding = addingCapCode === s.capCode;
                const primaryReason = s.reasons[0];
                const reasonColor = REASON_COLORS[primaryReason] || "#79d5e9";

                return (
                  <tr key={s.capCode} className="hover:bg-white/[0.02]">
                    <td className="py-2">
                      <div className="font-medium text-white">
                        {s.manufacturer} {s.model}
                      </div>
                      <div className="text-xs text-white/40">
                        {s.fuelType || "Unknown"} • {s.capCode}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="text-white font-medium">£{s.monthlyPriceGbp}</div>
                      <div className="text-xs text-white/40">
                        {PROVIDER_NAMES[s.bestProviderCode] || s.bestProviderCode}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      {s.marketAvgGbp ? (
                        <>
                          <div className="text-white/60">£{s.marketAvgGbp}</div>
                          {s.priceDeltaPercent !== null && (
                            <div
                              className={`text-xs ${
                                s.priceDeltaPercent < 0 ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {s.priceDeltaPercent > 0 ? "+" : ""}{s.priceDeltaPercent}%
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className="font-medium"
                        style={{
                          color:
                            s.valueScore >= 90
                              ? "#22c55e"
                              : s.valueScore >= 80
                              ? "#f97316"
                              : "#ffffff",
                        }}
                      >
                        {s.valueScore}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          background: `${reasonColor}20`,
                          color: reasonColor,
                        }}
                      >
                        {primaryReason.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {isAdded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-green-400">
                          <Check className="w-3 h-3" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToQueue(s.capCode)}
                          disabled={isAdding}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Add
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
  );
}
