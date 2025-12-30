"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Loader2,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown,
  Info,
} from "lucide-react";
import type {
  MarketPositionData,
  MarketPosition,
} from "@/app/api/admin/rates/market-position/route";

const POSITION_CONFIG: Record<
  MarketPosition,
  { color: string; bg: string; label: string; icon: typeof TrendingUp }
> = {
  lowest: {
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.15)",
    label: "Cheapest",
    icon: TrendingDown,
  },
  "below-avg": {
    color: "#86efac",
    bg: "rgba(134, 239, 172, 0.15)",
    label: "Below Avg",
    icon: TrendingDown,
  },
  average: {
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.15)",
    label: "Average",
    icon: Minus,
  },
  "above-avg": {
    color: "#fb923c",
    bg: "rgba(251, 146, 60, 0.15)",
    label: "Above Avg",
    icon: TrendingUp,
  },
  highest: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    label: "Highest",
    icon: TrendingUp,
  },
};

const CONTRACT_TYPES = [
  { value: "CHNM", label: "Business" },
  { value: "PCHNM", label: "Personal" },
];

const TERMS = [
  { value: 24, label: "24 months" },
  { value: 36, label: "36 months" },
  { value: 48, label: "48 months" },
];

const MILEAGES = [
  { value: 5000, label: "5,000 mi" },
  { value: 8000, label: "8,000 mi" },
  { value: 10000, label: "10,000 mi" },
  { value: 15000, label: "15,000 mi" },
];

interface MarketPositionResponse {
  positions: MarketPositionData[];
  filters: {
    contractType: string;
    term: number;
    mileage: number;
  };
}

export default function MarketPositionPage() {
  const [data, setData] = useState<MarketPositionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractType, setContractType] = useState("CHNM");
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(5000);
  const [positionFilter, setPositionFilter] = useState<MarketPosition | "">("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("contractType", contractType);
      params.set("term", term.toString());
      params.set("mileage", mileage.toString());
      params.set("limit", "100");

      const res = await fetch(`/api/admin/rates/market-position?${params}`);
      if (!res.ok) throw new Error("Failed to fetch market positions");

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
  }, [contractType, term, mileage]);

  const filteredPositions = data?.positions.filter(
    (p) => !positionFilter || p.position === positionFilter
  );

  // Calculate position distribution
  const positionCounts = data?.positions.reduce(
    (acc, p) => {
      acc[p.position] = (acc[p.position] || 0) + 1;
      return acc;
    },
    {} as Record<MarketPosition, number>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Position</h1>
          <p className="text-white/50 text-sm mt-1">
            Compare your pricing against market averages
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

      {/* Position Distribution */}
      {positionCounts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(["lowest", "below-avg", "average", "above-avg", "highest"] as MarketPosition[]).map(
            (pos) => {
              const config = POSITION_CONFIG[pos];
              const count = positionCounts[pos] || 0;
              const Icon = config.icon;
              return (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(positionFilter === pos ? "" : pos)}
                  className={`p-4 rounded-xl transition-all ${
                    positionFilter === pos ? "ring-2 ring-cyan-500" : ""
                  }`}
                  style={{
                    background:
                      positionFilter === pos
                        ? "rgba(121, 213, 233, 0.1)"
                        : "rgba(26, 31, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span className="text-xs text-white/50">{config.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{count}</div>
                </button>
              );
            }
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
          <span className="text-xs text-white/50">Contract:</span>
          <div className="flex gap-1">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setContractType(type.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  contractType === type.value
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Term:</span>
          <select
            value={term}
            onChange={(e) => setTerm(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {TERMS.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#1a1f2a]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Mileage:</span>
          <select
            value={mileage}
            onChange={(e) => setMileage(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {MILEAGES.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#1a1f2a]">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {filteredPositions && (
          <span className="ml-auto text-xs text-white/40">
            {filteredPositions.length} vehicles with market data
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
          <Info className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {data && (!filteredPositions || filteredPositions.length === 0) && (
        <div
          className="p-12 rounded-xl text-center"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Target className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Market Data</h3>
          <p className="text-white/50 text-sm">
            {positionFilter
              ? "No vehicles match this position filter."
              : "No vehicles have market intelligence data for comparison. Fetch competitor data first."}
          </p>
        </div>
      )}

      {/* Positions Table */}
      {filteredPositions && filteredPositions.length > 0 && (
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
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium text-right">Our Price</th>
                  <th className="px-4 py-3 font-medium text-right">Market Avg</th>
                  <th className="px-4 py-3 font-medium text-right">Market Range</th>
                  <th className="px-4 py-3 font-medium text-center">Position</th>
                  <th className="px-4 py-3 font-medium text-right">Delta</th>
                  <th className="px-4 py-3 font-medium text-right">Competitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPositions.map((position) => (
                  <PositionRow key={position.capCode} position={position} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionRow({ position }: { position: MarketPositionData }) {
  const config = POSITION_CONFIG[position.position];
  const PositionIcon = config.icon;
  const ourPriceGbp = Math.round(position.ourPrice / 100);
  const marketAvgGbp = Math.round(position.marketAvg / 100);
  const marketMinGbp = Math.round(position.marketMin / 100);
  const marketMaxGbp = Math.round(position.marketMax / 100);
  const deltaGbp = Math.round(position.priceDelta / 100);
  const isNegative = position.priceDeltaPercent > 0;

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="font-medium text-white">
          {position.manufacturer} {position.model}
        </div>
        <div className="text-xs text-white/40">{position.capCode}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-medium text-white">£{ourPriceGbp}/mo</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-white/60">£{marketAvgGbp}/mo</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-white/40">
          £{marketMinGbp} - £{marketMaxGbp}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
          style={{ background: config.bg, color: config.color }}
        >
          <PositionIcon className="w-3 h-3" />
          {config.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div
          className={`flex items-center justify-end gap-1 font-medium ${
            isNegative ? "text-red-400" : "text-green-400"
          }`}
        >
          {isNegative ? (
            <ArrowUp className="w-3 h-3" />
          ) : position.priceDeltaPercent < 0 ? (
            <ArrowDown className="w-3 h-3" />
          ) : null}
          {position.priceDeltaPercent !== 0
            ? `${isNegative ? "+" : ""}${position.priceDeltaPercent}%`
            : "—"}
        </div>
        {position.priceDelta !== 0 && (
          <div className="text-xs text-white/40">
            {deltaGbp > 0 ? "+" : ""}£{deltaGbp}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-white/60">{position.competitorCount}</span>
      </td>
    </tr>
  );
}
