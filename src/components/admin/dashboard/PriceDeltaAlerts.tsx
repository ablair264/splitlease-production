"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type {
  PriceDeltaAlert,
  PriceDeltaAlertsResponse,
  AlertSeverity,
} from "@/app/api/admin/alerts/price-delta/route";

interface PriceDeltaAlertsProps {
  className?: string;
  limit?: number;
  showSummary?: boolean;
  compact?: boolean;
}

const SEVERITY_CONFIG: Record<AlertSeverity, {
  icon: typeof AlertTriangle;
  bg: string;
  border: string;
  text: string;
  label: string;
}> = {
  critical: {
    icon: AlertTriangle,
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
    text: "#ef4444",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    bg: "rgba(249, 115, 22, 0.1)",
    border: "rgba(249, 115, 22, 0.3)",
    text: "#f97316",
    label: "Warning",
  },
  info: {
    icon: TrendingUp,
    bg: "rgba(59, 130, 246, 0.1)",
    border: "rgba(59, 130, 246, 0.3)",
    text: "#3b82f6",
    label: "Info",
  },
  opportunity: {
    icon: Sparkles,
    bg: "rgba(34, 197, 94, 0.1)",
    border: "rgba(34, 197, 94, 0.3)",
    text: "#22c55e",
    label: "Opportunity",
  },
};

export function PriceDeltaAlerts({
  className = "",
  limit = 10,
  showSummary = true,
  compact = false,
}: PriceDeltaAlertsProps) {
  const [data, setData] = useState<PriceDeltaAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (filter !== "all") params.set("severity", filter);

      const res = await fetch(`/api/admin/alerts/price-delta?${params}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch alerts");
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter, limit]);

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

  if (error) {
    return (
      <div
        className={`rounded-xl p-6 ${className}`}
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="text-red-400 text-center py-8">{error}</div>
      </div>
    );
  }

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
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Price Alerts</h3>
          {data && (
            <span className="text-xs text-white/50">
              ({data.summary.total} total)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary badges */}
      {showSummary && data && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/50 hover:text-white/70"
            }`}
          >
            All ({data.summary.total})
          </button>
          {data.summary.critical > 0 && (
            <button
              onClick={() => setFilter("critical")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === "critical"
                  ? "bg-red-500/30 text-red-400"
                  : "bg-red-500/10 text-red-400/70 hover:text-red-400"
              }`}
            >
              Critical ({data.summary.critical})
            </button>
          )}
          {data.summary.warning > 0 && (
            <button
              onClick={() => setFilter("warning")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === "warning"
                  ? "bg-orange-500/30 text-orange-400"
                  : "bg-orange-500/10 text-orange-400/70 hover:text-orange-400"
              }`}
            >
              Warning ({data.summary.warning})
            </button>
          )}
          {data.summary.opportunity > 0 && (
            <button
              onClick={() => setFilter("opportunity")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === "opportunity"
                  ? "bg-green-500/30 text-green-400"
                  : "bg-green-500/10 text-green-400/70 hover:text-green-400"
              }`}
            >
              Opportunities ({data.summary.opportunity})
            </button>
          )}
          {data.summary.info > 0 && (
            <button
              onClick={() => setFilter("info")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === "info"
                  ? "bg-blue-500/30 text-blue-400"
                  : "bg-blue-500/10 text-blue-400/70 hover:text-blue-400"
              }`}
            >
              Info ({data.summary.info})
            </button>
          )}
        </div>
      )}

      {/* Alerts list */}
      <div className={compact ? "max-h-[300px] overflow-y-auto" : ""}>
        {!data || data.alerts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-white/70 text-sm">No price alerts</p>
            <p className="text-white/40 text-xs mt-1">Prices are within market range</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className="px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Severity icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: config.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.text }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white text-sm truncate">
                          {alert.manufacturer} {alert.model}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: config.bg,
                            color: config.text,
                          }}
                        >
                          {alert.priceDeltaPercent > 0 ? "+" : ""}
                          {alert.priceDeltaPercent}%
                        </span>
                      </div>
                      {!compact && alert.variant && (
                        <p className="text-white/50 text-xs truncate mb-1">
                          {alert.variant}
                        </p>
                      )}
                      <p className="text-white/60 text-xs">{alert.message}</p>
                      {!compact && (
                        <p className="text-white/40 text-[10px] mt-1">
                          {alert.actionSuggestion}
                        </p>
                      )}
                    </div>

                    {/* Price info */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-medium text-sm">
                        £{alert.ourPriceGbp}
                      </div>
                      <div className="text-white/40 text-[10px]">
                        vs £{alert.marketAvgGbp} avg
                      </div>
                      <div className="text-white/30 text-[10px]">
                        {alert.competitorCount} competitors
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with summary stats */}
      {showSummary && data && data.alerts.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            {data.summary.potentialSavingsGbp > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <TrendingUp className="w-3 h-3" />
                <span>£{data.summary.potentialSavingsGbp}/mo over market</span>
              </div>
            )}
            {data.summary.potentialRevenueGbp > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <TrendingDown className="w-3 h-3" />
                <span>£{data.summary.potentialRevenueGbp}/mo under market</span>
              </div>
            )}
          </div>
          <a
            href="/admin/rates"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            View all <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
