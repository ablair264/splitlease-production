"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Deal {
  id: string;
  source: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  monthlyPriceGbp: number;
  term: number | null;
  valueScore: number | null;
  dealCount: number | null;
  imageUrl: string | null;
  matchConfidence: number | null;
  priceChangeGbp: number | null;
  priceChangePercent: number | null;
}

type SortField = "manufacturer" | "monthlyPriceGbp" | "valueScore" | "dealCount";
type SortOrder = "asc" | "desc";

const SOURCE_OPTIONS = [
  { value: "leasing_com", label: "Leasing.com", color: "#79d5e9" },
  { value: "leaseloco", label: "LeaseLoco", color: "#61bc8e" },
  { value: "appliedleasing", label: "Applied Leasing", color: "#f59e0b" },
  { value: "selectcarleasing", label: "Select Car Leasing", color: "#a855f7" },
  { value: "vipgateway", label: "VIP Gateway", color: "#ef4444" },
];

const getSourceBadge = (source: string) => {
  const match = SOURCE_OPTIONS.find((option) => option.value === source);
  if (!match) return { label: source, color: "#94a3b8" };
  return { label: match.label, color: match.color };
};

export function CompetitorDealsTab() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("monthlyPriceGbp");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Load deals
  useEffect(() => {
    const loadDeals = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("pageSize", "50");
        if (search) params.set("search", search);
        if (sourceFilter) params.set("source", sourceFilter);

        const response = await fetch(
          `/api/admin/intelligence/deals?${params.toString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setDeals(data.deals || []);
        }
      } catch (error) {
        console.error("Failed to load deals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(loadDeals, 300);
    return () => clearTimeout(debounce);
  }, [search, sourceFilter]);

  // Sort deals
  const sortedDeals = [...deals].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "manufacturer":
        comparison = a.manufacturer.localeCompare(b.manufacturer);
        break;
      case "monthlyPriceGbp":
        comparison = a.monthlyPriceGbp - b.monthlyPriceGbp;
        break;
      case "valueScore":
        comparison = (a.valueScore || 0) - (b.valueScore || 0);
        break;
      case "dealCount":
        comparison = (a.dealCount || 0) - (b.dealCount || 0);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-[#79d5e9]/50"
            />
          </div>

          {/* Source Filter */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setSourceFilter(null)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                !sourceFilter
                  ? "bg-[#79d5e9]/20 text-[#79d5e9]"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              All
            </button>
            {SOURCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSourceFilter(option.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  sourceFilter === option.value
                    ? "bg-[#79d5e9]/20 text-[#79d5e9]"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#79d5e9] animate-spin" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-white/50 text-sm mb-2">No competitor deals found.</p>
            <p className="text-white/40 text-xs">
              Click "Fetch Data" to load the latest deals.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0f1419]">
              <tr className="border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60">
                  Vehicle
                </th>
                <th
                  onClick={() => handleSort("monthlyPriceGbp")}
                  className="px-4 py-3 text-left text-xs font-medium text-white/60 cursor-pointer hover:text-white/80"
                >
                  <div className="flex items-center gap-1">
                    Price
                    <SortIcon field="monthlyPriceGbp" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60">
                  Source
                </th>
                <th
                  onClick={() => handleSort("valueScore")}
                  className="px-4 py-3 text-left text-xs font-medium text-white/60 cursor-pointer hover:text-white/80"
                >
                  <div className="flex items-center gap-1">
                    Score
                    <SortIcon field="valueScore" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {deal.imageUrl && (
                        <img
                          src={deal.imageUrl}
                          alt=""
                          className="w-12 h-8 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">
                          {deal.manufacturer} {deal.model}
                        </div>
                        {deal.variant && (
                          <div className="text-xs text-white/50 truncate max-w-[200px]">
                            {deal.variant}
                          </div>
                        )}
                        {deal.fuelType && (
                          <span
                            className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              background:
                                deal.fuelType.toLowerCase().includes("electric")
                                  ? "rgba(77, 174, 172, 0.2)"
                                  : "rgba(255, 255, 255, 0.1)",
                              color:
                                deal.fuelType.toLowerCase().includes("electric")
                                  ? "#4daeac"
                                  : "rgba(255, 255, 255, 0.6)",
                            }}
                          >
                            {deal.fuelType}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">
                      £{deal.monthlyPriceGbp}/mo
                    </div>
                    {deal.term && (
                      <div className="text-xs text-white/50">
                        {deal.term} months
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deal.priceChangeGbp !== null && deal.priceChangeGbp !== 0 ? (
                      <div
                        className={`flex items-center gap-1 text-xs font-medium ${
                          deal.priceChangeGbp < 0
                            ? "text-[#61bc8e]"
                            : "text-[#f77d11]"
                        }`}
                      >
                        {deal.priceChangeGbp < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3" />
                        )}
                        £{Math.abs(deal.priceChangeGbp)}
                        {deal.priceChangePercent && (
                          <span className="text-white/40">
                            ({deal.priceChangePercent > 0 ? "+" : ""}
                            {deal.priceChangePercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const badge = getSourceBadge(deal.source);
                      return (
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: `${badge.color}26`,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {deal.valueScore !== null ? (
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-semibold"
                        style={{
                          background:
                            deal.valueScore >= 80
                              ? "rgba(97, 188, 142, 0.15)"
                              : deal.valueScore >= 60
                                ? "rgba(121, 213, 233, 0.15)"
                                : "rgba(248, 216, 36, 0.15)",
                          color:
                            deal.valueScore >= 80
                              ? "#61bc8e"
                              : deal.valueScore >= 60
                                ? "#79d5e9"
                                : "#f8d824",
                        }}
                      >
                        {deal.valueScore}
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
