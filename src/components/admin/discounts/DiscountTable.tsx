"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Tag,
  TrendingDown,
  Package,
  Building2,
} from "lucide-react";
import type { DiscountTerm, DiscountStats } from "@/app/api/admin/discounts/route";

interface DiscountTableProps {
  className?: string;
}

type SortField = "make" | "model" | "discountPercent" | "savings" | "capPrice" | "scrapedAt";

export function DiscountTable({ className = "" }: DiscountTableProps) {
  const [terms, setTerms] = useState<DiscountTerm[]>([]);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [makeFilter, setMakeFilter] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState<SortField>("scrapedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          sortBy,
          sortOrder,
        });

        if (makeFilter) params.set("make", makeFilter);
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/admin/discounts?${params}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch discounts");
        }

        const data = await res.json();
        setTerms(data.terms);
        setStats(data.stats);
        setMakes(data.makes);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, makeFilter, debouncedSearch, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "-";
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalTerms.toLocaleString()}</div>
                <div className="text-xs text-white/50">Total Discounts</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/20">
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.uniqueMakes}</div>
                <div className="text-xs text-white/50">Manufacturers</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/20">
                <TrendingDown className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.avgDiscountPercent}%</div>
                <div className="text-xs text-white/50">Avg Discount</div>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(250, 204, 21, 0.05) 100%)",
              border: "1px solid rgba(250, 204, 21, 0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-500/20">
                <Tag className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalSavingsGbp)}
                </div>
                <div className="text-xs text-white/50">Total Savings</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search model or derivative..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            style={{
              background: "rgba(26, 31, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          />
        </div>

        <select
          value={makeFilter}
          onChange={(e) => {
            setMakeFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <option value="">All Manufacturers</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </select>

        <div className="text-sm text-white/50">
          {total.toLocaleString()} results
        </div>
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
                <th
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/70"
                  onClick={() => handleSort("make")}
                >
                  <div className="flex items-center gap-1">
                    Make <SortIcon field="make" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/70"
                  onClick={() => handleSort("model")}
                >
                  <div className="flex items-center gap-1">
                    Model <SortIcon field="model" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Derivative
                </th>
                <th
                  className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/50 cursor-pointer hover:text-white/70"
                  onClick={() => handleSort("capPrice")}
                >
                  <div className="flex items-center justify-end gap-1">
                    CAP Price <SortIcon field="capPrice" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-green-400 cursor-pointer hover:text-green-300"
                  onClick={() => handleSort("discountPercent")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Discount <SortIcon field="discountPercent" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Net Price
                </th>
                <th
                  className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-yellow-400 cursor-pointer hover:text-yellow-300"
                  onClick={() => handleSort("savings")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Savings <SortIcon field="savings" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  CO2
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-red-400">
                    {error}
                  </td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-white/50">
                    No discount terms found
                  </td>
                </tr>
              ) : (
                terms.map((term, idx) => (
                  <tr
                    key={term.id}
                    className={`
                      transition-colors hover:bg-white/[0.03]
                      ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}
                    `}
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {term.make}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/80">
                      {term.model}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60 max-w-[200px] truncate" title={term.derivative || ""}>
                      {term.derivative || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70 text-right font-mono">
                      {formatCurrency(term.capPriceGbp)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {term.discountPercent !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-semibold">
                          -{formatPercent(term.discountPercent)}
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-mono font-medium">
                      {formatCurrency(term.discountedPriceGbp)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {term.savingsGbp !== null ? (
                        <span className="text-yellow-400 text-sm font-semibold">
                          {formatCurrency(term.savingsGbp)}
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-white/60">
                      {term.co2 !== null ? `${term.co2}g/km` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {term.buildUrl ? (
                        <a
                          href={term.buildUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            background: "rgba(26, 31, 42, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="text-sm text-white/50">
            Page {page} of {totalPages}
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
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
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
