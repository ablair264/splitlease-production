"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  Loader2,
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { FunderPerformanceResponse, FunderPerformanceMetrics, FunderComparisonData } from "@/app/api/admin/funders/performance/route";

const PROVIDER_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  lex: { bg: "rgba(121, 213, 233, 0.15)", text: "#79d5e9", bar: "#79d5e9" },
  ogilvie: { bg: "rgba(97, 188, 142, 0.15)", text: "#61bc8e", bar: "#61bc8e" },
  venus: { bg: "rgba(248, 216, 36, 0.15)", text: "#f8d824", bar: "#f8d824" },
  drivalia: { bg: "rgba(247, 125, 17, 0.15)", text: "#f77d11", bar: "#f77d11" },
};

export default function FunderPerformancePage() {
  const [data, setData] = useState<FunderPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractType, setContractType] = useState<string>("");
  const [showComparisons, setShowComparisons] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (contractType) params.set("contractType", contractType);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/funders/performance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch performance data");

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
  }, [contractType]);

  const formatPrice = (price: number) => `£${price.toLocaleString()}`;

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
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

  // Find max values for bar scaling
  const maxBestPrice = Math.max(...(data?.funders.map((f) => f.bestPricePercent) || [1]));
  const maxVehicles = Math.max(...(data?.funders.map((f) => f.uniqueCapCodes) || [1]));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Funder Performance</h1>
          <p className="text-white/60 mt-1">
            Compare pricing competitiveness across funders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="" className="bg-[#1a1f2a]">All Contract Types</option>
            <option value="CH" className="bg-[#1a1f2a]">Contract Hire</option>
            <option value="CHNM" className="bg-[#1a1f2a]">Contract Hire (No Maint)</option>
            <option value="PCH" className="bg-[#1a1f2a]">Personal Contract Hire</option>
            <option value="PCHNM" className="bg-[#1a1f2a]">Personal CH (No Maint)</option>
            <option value="BSSNL" className="bg-[#1a1f2a]">Salary Sacrifice</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Vehicles"
            value={data.summary.totalVehicles.toLocaleString()}
            icon={BarChart3}
            color="#79d5e9"
          />
          <SummaryCard
            label="Active Funders"
            value={data.summary.totalProviders.toString()}
            icon={Target}
            color="#a855f7"
          />
          <SummaryCard
            label="Avg Competition"
            value={`${data.summary.avgCompetition} funders/vehicle`}
            icon={TrendingUp}
            color="#22c55e"
          />
          <SummaryCard
            label="Most Competitive"
            value={data.summary.mostCompetitive}
            icon={Trophy}
            color="#f8d824"
          />
        </div>
      )}

      {/* Funder Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.funders
            .sort((a, b) => b.bestPricePercent - a.bestPricePercent)
            .map((funder) => (
              <FunderCard
                key={funder.code}
                funder={funder}
                maxBestPrice={maxBestPrice}
                maxVehicles={maxVehicles}
                formatPrice={formatPrice}
              />
            ))}
        </div>
      )}

      {/* Price Comparisons */}
      {data && data.comparisons.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={() => setShowComparisons(!showComparisons)}
            className="w-full px-4 py-3 border-b border-white/10 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-white">
                Price Comparisons ({data.comparisons.length})
              </h3>
              <span className="text-xs text-white/50">
                Vehicles with biggest price differences
              </span>
            </div>
            {showComparisons ? (
              <ChevronUp className="w-4 h-4 text-white/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/50" />
            )}
          </button>

          {showComparisons && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">
                      Vehicle
                    </th>
                    {["lex", "ogilvie", "venus", "drivalia"].map((code) => (
                      <th
                        key={code}
                        className="px-4 py-3 text-right text-xs font-medium uppercase"
                        style={{ color: PROVIDER_COLORS[code]?.text }}
                      >
                        {code}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.comparisons.slice(0, 20).map((comp) => (
                    <ComparisonRow
                      key={comp.capCode}
                      comparison={comp}
                      formatPrice={formatPrice}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
  value: string;
  icon: typeof Trophy;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function FunderCard({
  funder,
  maxBestPrice,
  maxVehicles,
  formatPrice,
}: {
  funder: FunderPerformanceMetrics;
  maxBestPrice: number;
  maxVehicles: number;
  formatPrice: (n: number) => string;
}) {
  const colors = PROVIDER_COLORS[funder.code] || {
    bg: "rgba(255,255,255,0.1)",
    text: "#ffffff",
    bar: "#ffffff",
  };

  const freshnessColor =
    funder.daysSinceImport <= 7
      ? "#22c55e"
      : funder.daysSinceImport <= 14
      ? "#f97316"
      : "#ef4444";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-white/10 flex items-center justify-between"
        style={{ background: colors.bg }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <span className="text-xs font-bold uppercase" style={{ color: colors.text }}>
              {funder.code.slice(0, 3)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-white">{funder.name}</h3>
            <div className="flex items-center gap-1 text-xs" style={{ color: freshnessColor }}>
              <Clock className="w-3 h-3" />
              {funder.daysSinceImport === -1
                ? "No imports"
                : funder.daysSinceImport === 0
                ? "Updated today"
                : `${funder.daysSinceImport}d ago`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4" style={{ color: colors.text }} />
            <span className="text-2xl font-bold" style={{ color: colors.text }}>
              {funder.bestPricePercent}%
            </span>
          </div>
          <div className="text-xs text-white/50">best price</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 space-y-4">
        {/* Best Price Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/50">Best Price Rate</span>
            <span className="text-white">{funder.bestPriceCount} vehicles</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(funder.bestPricePercent / maxBestPrice) * 100}%`,
                background: colors.bar,
              }}
            />
          </div>
        </div>

        {/* Coverage Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/50">Coverage</span>
            <span className="text-white">{funder.uniqueCapCodes.toLocaleString()} vehicles</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(funder.uniqueCapCodes / maxVehicles) * 100}%`,
                background: colors.bar,
                opacity: 0.6,
              }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{funder.avgPricePosition || "—"}</div>
            <div className="text-[10px] text-white/40">Avg Position</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{funder.avgScore || "—"}</div>
            <div className="text-[10px] text-white/40">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{funder.excellentScoreCount}</div>
            <div className="text-[10px] text-white/40">90+ Scores</div>
          </div>
        </div>

        {/* Price Range */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="text-white/50">Price Range</span>
          <span className="text-white">
            {formatPrice(funder.minMonthlyPriceGbp)} – {formatPrice(funder.maxMonthlyPriceGbp)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  comparison,
  formatPrice,
}: {
  comparison: FunderComparisonData;
  formatPrice: (n: number) => string;
}) {
  const providers = ["lex", "ogilvie", "venus", "drivalia"];
  const prices = providers.map((p) => comparison.prices[p]);
  const minPrice = Math.min(...prices.filter((p): p is number => p !== null));

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-white">
          {comparison.manufacturer} {comparison.model}
        </div>
        <div className="text-xs text-white/40">{comparison.capCode}</div>
      </td>
      {providers.map((code) => {
        const price = comparison.prices[code];
        const isBest = price === minPrice;
        const colors = PROVIDER_COLORS[code];

        return (
          <td key={code} className="px-4 py-3 text-right">
            {price !== null ? (
              <span
                className={`text-sm font-medium ${isBest ? "font-bold" : ""}`}
                style={{ color: isBest ? colors?.text : "rgba(255,255,255,0.6)" }}
              >
                {formatPrice(price)}
                {isBest && <Trophy className="w-3 h-3 inline ml-1" />}
              </span>
            ) : (
              <span className="text-white/30">—</span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-green-400">
          {formatPrice(comparison.priceDiff)}
        </span>
      </td>
    </tr>
  );
}
