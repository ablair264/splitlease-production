"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Car,
  TrendingUp,
} from "lucide-react";
import type { CoverageGap, CoverageGapsResponse, ProviderCoverage } from "@/app/api/admin/funders/coverage-gaps/route";

interface CoverageGapTableProps {
  className?: string;
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  lex: { bg: "rgba(121, 213, 233, 0.2)", text: "#79d5e9" },
  ogilvie: { bg: "rgba(97, 188, 142, 0.2)", text: "#61bc8e" },
  venus: { bg: "rgba(248, 216, 36, 0.2)", text: "#f8d824" },
  drivalia: { bg: "rgba(247, 125, 17, 0.2)", text: "#f77d11" },
};

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex",
  ogilvie: "Ogilvie",
  venus: "Venus",
  drivalia: "Drivalia",
};

export function CoverageGapTable({ className = "" }: CoverageGapTableProps) {
  const [data, setData] = useState<CoverageGapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [missingProvider, setMissingProvider] = useState<string>("");
  const [minGap, setMinGap] = useState<number>(1);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          minGap: minGap.toString(),
        });

        if (missingProvider) params.set("missingProvider", missingProvider);

        const res = await fetch(`/api/admin/funders/coverage-gaps?${params}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch coverage gaps");
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, missingProvider, minGap]);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return "-";
    return `£${value.toLocaleString("en-GB")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Provider Coverage Summary */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          {data.providerCoverage.map((provider) => {
            const colors = PROVIDER_COLORS[provider.code] || { bg: "rgba(255,255,255,0.1)", text: "#ffffff" };
            return (
              <div
                key={provider.code}
                className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(0,0,0,0) 100%)`,
                  border: `1px solid ${colors.text}30`,
                }}
                onClick={() => setMissingProvider(missingProvider === provider.code ? "" : provider.code)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: colors.text }}
                  >
                    {provider.name}
                  </span>
                  {missingProvider === provider.code && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      Filtering
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {provider.uniqueCapCodes.toLocaleString()}
                </div>
                <div className="text-xs text-white/50">
                  vehicles • {formatCurrency(provider.avgPrice)} avg
                </div>
                <div className="text-[10px] text-white/40 mt-2">
                  Last import: {formatDate(provider.lastImport)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {data && (
        <div className="flex items-center gap-6 px-4 py-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="text-white/70 text-sm">
              <span className="text-white font-medium">{data.summary.totalVehicles.toLocaleString()}</span> total vehicles
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-white/70 text-sm">
              <span className="text-green-400 font-medium">{data.summary.fullCoverage}</span> full coverage
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-white/70 text-sm">
              <span className="text-amber-400 font-medium">{data.summary.partialCoverage}</span> partial
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-white/70 text-sm">
              <span className="text-red-400 font-medium">{data.summary.singleProvider}</span> single provider
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-white/70 text-sm">
              <span className="text-purple-400 font-medium">{data.summary.avgCoveragePercent}%</span> avg coverage
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">Min gaps:</span>
          <select
            value={minGap}
            onChange={(e) => {
              setMinGap(parseInt(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            style={{
              background: "rgba(26, 31, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <option value="1">1+ missing</option>
            <option value="2">2+ missing</option>
            <option value="3">3+ missing</option>
          </select>
        </div>

        {missingProvider && (
          <button
            onClick={() => setMissingProvider("")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          >
            <span>Missing: {PROVIDER_NAMES[missingProvider]}</span>
            <XCircle className="w-3 h-3" />
          </button>
        )}

        {data && (
          <div className="ml-auto text-sm text-white/50">
            {data.pagination.total.toLocaleString()} gaps found
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(180deg, rgba(15, 20, 25, 0.98) 0%, rgba(20, 25, 32, 0.98) 100%)",
                }}
              >
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  CAP Code
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Coverage
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Present
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-red-400">
                  Missing
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Best Price
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              ) : !data || data.gaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                      <p className="text-white/70">No coverage gaps found</p>
                      <p className="text-white/40 text-sm">All vehicles have coverage from all providers</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.gaps.map((gap, idx) => (
                  <tr
                    key={gap.capCode}
                    className={`
                      transition-colors hover:bg-white/[0.03]
                      ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}
                    `}
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm">
                        {gap.manufacturer} {gap.model}
                      </div>
                      {gap.variant && (
                        <div className="text-white/50 text-xs truncate max-w-[200px]" title={gap.variant}>
                          {gap.variant}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-white/60">
                      {gap.capCode}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          gap.coveragePercent >= 75
                            ? "bg-green-500/20 text-green-400"
                            : gap.coveragePercent >= 50
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {gap.coveragePercent}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {gap.presentProviders.map((p) => {
                          const colors = PROVIDER_COLORS[p] || { bg: "rgba(255,255,255,0.1)", text: "#ffffff" };
                          return (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                              style={{ background: colors.bg, color: colors.text }}
                              title={PROVIDER_NAMES[p]}
                            >
                              {p.slice(0, 3)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {gap.missingProviders.map((p) => {
                          const colors = PROVIDER_COLORS[p] || { bg: "rgba(255,255,255,0.1)", text: "#ffffff" };
                          return (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase opacity-50 line-through"
                              style={{ background: colors.bg, color: colors.text }}
                              title={`Missing: ${PROVIDER_NAMES[p]}`}
                            >
                              {p.slice(0, 3)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white font-medium">
                      {formatCurrency(gap.bestAvailablePrice)}
                      <span className="text-white/40 text-[10px]">/mo</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {gap.potentialImprovement}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            background: "rgba(26, 31, 42, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="text-sm text-white/50">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/70 hover:text-white hover:bg-white/5"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-white/70 hover:text-white hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
