"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Calendar,
  TrendingDown,
} from "lucide-react";

interface ProviderFreshness {
  code: string;
  name: string;
  lastImport: string | null;
  daysSinceImport: number;
  rateCount: number;
  status: "fresh" | "stale" | "critical" | "never";
}

interface FreshnessData {
  providers: ProviderFreshness[];
  summary: {
    freshCount: number;
    staleCount: number;
    criticalCount: number;
    oldestDays: number;
  };
}

interface RateFreshnessWidgetProps {
  className?: string;
  compact?: boolean;
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  lex: { bg: "rgba(121, 213, 233, 0.2)", text: "#79d5e9" },
  ogilvie: { bg: "rgba(97, 188, 142, 0.2)", text: "#61bc8e" },
  venus: { bg: "rgba(248, 216, 36, 0.2)", text: "#f8d824" },
  drivalia: { bg: "rgba(247, 125, 17, 0.2)", text: "#f77d11" },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  fresh: { icon: CheckCircle2, color: "#22c55e", label: "Fresh" },
  stale: { icon: Clock, color: "#f97316", label: "Stale" },
  critical: { icon: AlertTriangle, color: "#ef4444", label: "Critical" },
  never: { icon: TrendingDown, color: "#6b7280", label: "No Data" },
};

export function RateFreshnessWidget({ className = "", compact = false }: RateFreshnessWidgetProps) {
  const [data, setData] = useState<FreshnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from coverage gaps endpoint which has provider stats
      const res = await fetch("/api/admin/funders/coverage-gaps?pageSize=1");
      if (!res.ok) throw new Error("Failed to fetch freshness data");

      const result = await res.json();

      // Process provider coverage data
      const providers: ProviderFreshness[] = result.providerCoverage.map((p: {
        code: string;
        name: string;
        lastImport: string | null;
        uniqueCapCodes: number;
      }) => {
        let daysSinceImport = -1;
        let status: ProviderFreshness["status"] = "never";

        if (p.lastImport) {
          const lastDate = new Date(p.lastImport);
          const now = new Date();
          daysSinceImport = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysSinceImport <= 7) {
            status = "fresh";
          } else if (daysSinceImport <= 14) {
            status = "stale";
          } else {
            status = "critical";
          }
        }

        return {
          code: p.code,
          name: p.name,
          lastImport: p.lastImport,
          daysSinceImport,
          rateCount: p.uniqueCapCodes,
          status,
        };
      });

      // Sort by staleness
      providers.sort((a, b) => {
        if (a.status === "never") return 1;
        if (b.status === "never") return -1;
        return b.daysSinceImport - a.daysSinceImport;
      });

      const summary = {
        freshCount: providers.filter((p) => p.status === "fresh").length,
        staleCount: providers.filter((p) => p.status === "stale").length,
        criticalCount: providers.filter((p) => p.status === "critical" || p.status === "never").length,
        oldestDays: Math.max(...providers.filter((p) => p.daysSinceImport >= 0).map((p) => p.daysSinceImport), 0),
      };

      setData({ providers, summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div
        className={`rounded-xl p-6 ${className}`}
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-center py-6">
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
        <div className="text-red-400 text-center py-6">{error}</div>
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
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Rate Freshness</h3>
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

      {/* Summary badges */}
      {data && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          {data.summary.freshCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-medium">{data.summary.freshCount}</span>
              <span className="text-white/50">fresh</span>
            </div>
          )}
          {data.summary.staleCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className="text-orange-400 font-medium">{data.summary.staleCount}</span>
              <span className="text-white/50">stale</span>
            </div>
          )}
          {data.summary.criticalCount > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-medium">{data.summary.criticalCount}</span>
              <span className="text-white/50">critical</span>
            </div>
          )}
        </div>
      )}

      {/* Provider list */}
      {data && (
        <div className={compact ? "max-h-[200px] overflow-y-auto" : ""}>
          <div className="divide-y divide-white/5">
            {data.providers.map((provider) => {
              const providerColor = PROVIDER_COLORS[provider.code] || { bg: "rgba(255,255,255,0.1)", text: "#ffffff" };
              const statusConfig = STATUS_CONFIG[provider.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={provider.code}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: providerColor.bg }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase"
                        style={{ color: providerColor.text }}
                      >
                        {provider.code.slice(0, 3)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {provider.name}
                      </div>
                      <div className="text-xs text-white/50">
                        {provider.rateCount.toLocaleString()} vehicles
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <StatusIcon
                          className="w-3 h-3"
                          style={{ color: statusConfig.color }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: statusConfig.color }}
                        >
                          {provider.status === "never"
                            ? "No imports"
                            : provider.daysSinceImport === 0
                            ? "Today"
                            : provider.daysSinceImport === 1
                            ? "Yesterday"
                            : `${provider.daysSinceImport}d ago`}
                        </span>
                      </div>
                      {provider.lastImport && (
                        <div className="text-[10px] text-white/40 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(provider.lastImport).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer warning for stale rates */}
      {data && data.summary.oldestDays > 14 && (
        <div className="px-4 py-2 border-t border-white/10 bg-red-500/10">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Some rates are over 2 weeks old - consider refreshing</span>
          </div>
        </div>
      )}
    </div>
  );
}
