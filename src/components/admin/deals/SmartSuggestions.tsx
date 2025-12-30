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
  Plus,
  ChevronRight,
  Info,
} from "lucide-react";
import type { SmartSuggestion, SmartSuggestionsResponse } from "@/app/api/admin/offers/suggestions/route";

interface SmartSuggestionsProps {
  className?: string;
  onAddToQueue?: (capCode: string) => void;
}

const REASON_ICONS: Record<string, typeof Trophy> = {
  exceptional_value: Trophy,
  market_beater: TrendingUp,
  price_drop: Zap,
  popular_segment: Target,
  low_competition: Sparkles,
  high_margin_potential: Target,
};

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
  const [activeTab, setActiveTab] = useState<"all" | "exceptional" | "market" | "trending">("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/offers/suggestions?limit=8");
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

      // Refresh suggestions
      await fetchData();

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

  const formatPrice = (price: number) => `£${price.toLocaleString()}`;

  if (loading && !data) {
    return (
      <div
        className={`rounded-xl p-6 ${className}`}
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className={`rounded-xl p-6 ${className}`}
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="text-red-400 text-center py-6">{error}</div>
      </div>
    );
  }

  const suggestions = getDisplaySuggestions();

  return (
    <div
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Smart Suggestions</h3>
          {data && (
            <span className="text-xs text-white/40">
              {data.metadata.totalAnalyzed} deals analyzed
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-white/10 flex gap-2">
        {[
          { id: "all", label: "All", count: data?.suggestions.length || 0 },
          { id: "exceptional", label: "Exceptional", count: data?.categories.exceptionalValue.length || 0 },
          { id: "market", label: "Market Beaters", count: data?.categories.marketBeaters.length || 0 },
          { id: "trending", label: "Trending", count: data?.categories.trending.length || 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Info className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-white/50 text-sm">No suggestions in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.capCode}
              suggestion={suggestion}
              onAdd={() => handleAddToQueue(suggestion.capCode)}
              isAdding={addingCapCode === suggestion.capCode}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {data?.metadata.marketDataFreshness && (
        <div className="px-4 py-2 border-t border-white/10 text-xs text-white/40">
          Market data from{" "}
          {new Date(data.metadata.marketDataFreshness).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAdd,
  isAdding,
  formatPrice,
}: {
  suggestion: SmartSuggestion;
  onAdd: () => void;
  isAdding: boolean;
  formatPrice: (n: number) => string;
}) {
  const primaryReason = suggestion.reasons[0];
  const ReasonIcon = REASON_ICONS[primaryReason] || Sparkles;
  const reasonColor = REASON_COLORS[primaryReason] || "#79d5e9";

  return (
    <div className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
      {/* Header with headline */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${reasonColor}20` }}
          >
            <ReasonIcon className="w-4 h-4" style={{ color: reasonColor }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {suggestion.headline}
            </div>
            <div className="text-xs text-white/40">
              {suggestion.capCode} • {suggestion.fuelType || "Unknown fuel"}
            </div>
          </div>
        </div>

        {/* Confidence badge */}
        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            background:
              suggestion.confidenceScore >= 80
                ? "rgba(34, 197, 94, 0.15)"
                : suggestion.confidenceScore >= 60
                ? "rgba(249, 115, 22, 0.15)"
                : "rgba(107, 114, 128, 0.15)",
            color:
              suggestion.confidenceScore >= 80
                ? "#22c55e"
                : suggestion.confidenceScore >= 60
                ? "#f97316"
                : "#6b7280",
          }}
        >
          {suggestion.confidenceScore}% confidence
        </div>
      </div>

      {/* Explanation */}
      <p className="text-xs text-white/60 mb-3">{suggestion.explanation}</p>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-white font-medium">
              {formatPrice(suggestion.monthlyPriceGbp)}/mo
            </span>
            <span className="text-white/40 ml-1">
              via {PROVIDER_NAMES[suggestion.bestProviderCode] || suggestion.bestProviderCode}
            </span>
          </div>

          {suggestion.marketAvgGbp && (
            <div className="flex items-center gap-1">
              <span className="text-white/40">Market:</span>
              <span className="text-white/60">
                {formatPrice(suggestion.marketAvgGbp)}
              </span>
              {suggestion.priceDeltaPercent !== null && (
                <span
                  className={
                    suggestion.priceDeltaPercent < 0
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  ({suggestion.priceDeltaPercent > 0 ? "+" : ""}
                  {suggestion.priceDeltaPercent}%)
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-white/40">Score:</span>
            <span
              className="font-medium"
              style={{
                color:
                  suggestion.valueScore >= 90
                    ? "#22c55e"
                    : suggestion.valueScore >= 80
                    ? "#f97316"
                    : "#ffffff",
              }}
            >
              {suggestion.valueScore}
            </span>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={isAdding}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Add to Queue
            </>
          )}
        </button>
      </div>

      {/* Reason tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        {suggestion.reasons.map((reason) => (
          <span
            key={reason}
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{
              background: `${REASON_COLORS[reason] || "#79d5e9"}15`,
              color: REASON_COLORS[reason] || "#79d5e9",
            }}
          >
            {reason.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
