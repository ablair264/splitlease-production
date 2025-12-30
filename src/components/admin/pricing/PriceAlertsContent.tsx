"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Target,
  Loader2,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import type {
  PriceDeltaAlert,
  PriceDeltaAlertsResponse,
  AlertSeverity,
  AlertType,
} from "@/app/api/admin/alerts/price-delta/route";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { icon: typeof AlertTriangle; color: string; bg: string; label: string }
> = {
  critical: {
    icon: AlertTriangle,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.15)",
    label: "Warning",
  },
  opportunity: {
    icon: Sparkles,
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.15)",
    label: "Opportunity",
  },
  info: {
    icon: Info,
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.15)",
    label: "Info",
  },
};

const TYPE_LABELS: Record<AlertType, string> = {
  too_expensive: "Too Expensive",
  too_cheap: "Underpriced",
  no_coverage: "No Coverage",
  beating_market: "Beating Market",
};

export default function PriceAlertsContent() {
  const [data, setData] = useState<PriceDeltaAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "">("");
  const [typeFilter, setTypeFilter] = useState<AlertType | "">("");
  const [threshold, setThreshold] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("threshold", threshold.toString());
      if (severityFilter) params.set("severity", severityFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/admin/alerts/price-delta?${params}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");

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
  }, [severityFilter, typeFilter, threshold]);

  return (
    <div className="space-y-6 p-6 overflow-auto h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Price Alerts</h2>
          <p className="text-white/50 text-sm mt-1">
            Monitor pricing discrepancies vs market averages
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            label="Total Alerts"
            value={data.summary.total}
            icon={Target}
            color="#79d5e9"
          />
          <SummaryCard
            label="Critical"
            value={data.summary.critical}
            icon={AlertTriangle}
            color="#ef4444"
          />
          <SummaryCard
            label="Warnings"
            value={data.summary.warning}
            icon={AlertTriangle}
            color="#f97316"
          />
          <SummaryCard
            label="Opportunities"
            value={data.summary.opportunity}
            icon={Sparkles}
            color="#22c55e"
          />
          <SummaryCard
            label="Info"
            value={data.summary.info}
            icon={Info}
            color="#3b82f6"
          />
        </div>
      )}

      {/* Financial Impact */}
      {data && (data.summary.potentialSavingsGbp > 0 || data.summary.potentialRevenueGbp > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.summary.potentialSavingsGbp > 0 && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">Overpriced Items</span>
              </div>
              <div className="text-2xl font-bold text-white">
                £{data.summary.potentialSavingsGbp.toLocaleString()}
              </div>
              <p className="text-xs text-white/50 mt-1">
                Total monthly price above market average
              </p>
            </div>
          )}
          {data.summary.potentialRevenueGbp > 0 && (
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Potential Margin</span>
              </div>
              <div className="text-2xl font-bold text-white">
                £{data.summary.potentialRevenueGbp.toLocaleString()}
              </div>
              <p className="text-xs text-white/50 mt-1">
                Underpriced items that could be adjusted
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Filter className="w-4 h-4 text-white/50" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | "")}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            <option value="" className="bg-[#1a1f2a]">All</option>
            <option value="critical" className="bg-[#1a1f2a]">Critical</option>
            <option value="warning" className="bg-[#1a1f2a]">Warning</option>
            <option value="opportunity" className="bg-[#1a1f2a]">Opportunity</option>
            <option value="info" className="bg-[#1a1f2a]">Info</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AlertType | "")}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            <option value="" className="bg-[#1a1f2a]">All</option>
            <option value="too_expensive" className="bg-[#1a1f2a]">Too Expensive</option>
            <option value="too_cheap" className="bg-[#1a1f2a]">Underpriced</option>
            <option value="beating_market" className="bg-[#1a1f2a]">Beating Market</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Threshold:</span>
          <select
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            <option value="5" className="bg-[#1a1f2a]">5%</option>
            <option value="10" className="bg-[#1a1f2a]">10%</option>
            <option value="15" className="bg-[#1a1f2a]">15%</option>
            <option value="20" className="bg-[#1a1f2a]">20%</option>
          </select>
        </div>

        {data && (
          <span className="ml-auto text-xs text-white/40">
            {data.alerts.length} alerts shown
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {data && data.alerts.length === 0 && (
        <div
          className="p-12 rounded-xl text-center"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Target className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
          <p className="text-white/50 text-sm">
            {severityFilter || typeFilter
              ? "No alerts match your filters. Try adjusting the filters."
              : "No price discrepancies detected. Market intelligence data may need to be fetched."}
          </p>
        </div>
      )}

      {/* Alerts Table */}
      {data && data.alerts.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/50 border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium text-right">Our Price</th>
                  <th className="px-4 py-3 font-medium text-right">Market Avg</th>
                  <th className="px-4 py-3 font-medium text-right">Delta</th>
                  <th className="px-4 py-3 font-medium">Funder</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof AlertTriangle;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function AlertRow({ alert }: { alert: PriceDeltaAlert }) {
  const severity = SEVERITY_CONFIG[alert.severity];
  const SeverityIcon = severity.icon;
  const isNegative = alert.priceDeltaPercent > 0;

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
          style={{ background: severity.bg, color: severity.color }}
        >
          <SeverityIcon className="w-3 h-3" />
          {severity.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-white">
          {alert.manufacturer} {alert.model}
        </div>
        <div className="text-xs text-white/40">{alert.capCode}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-white">£{alert.ourPriceGbp}/mo</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-white/60">£{alert.marketAvgGbp}/mo</span>
        <div className="text-xs text-white/40">
          £{alert.marketMinGbp} - £{alert.marketMaxGbp}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div
          className={`flex items-center justify-end gap-1 font-medium ${
            isNegative ? "text-red-400" : "text-green-400"
          }`}
        >
          {isNegative ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          {Math.abs(alert.priceDeltaPercent)}%
        </div>
        <div className="text-xs text-white/40">
          {isNegative ? "+" : "-"}£{Math.abs(alert.priceDeltaGbp)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-white/60 text-xs">{alert.bestFunder}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-white/50">{alert.actionSuggestion}</span>
      </td>
    </tr>
  );
}
