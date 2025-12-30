"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Award,
  AlertTriangle,
} from "lucide-react";
import type {
  OfferPerformanceResponse,
  OfferPerformanceData,
} from "@/app/api/admin/offers/performance/route";

interface OfferPerformanceProps {
  className?: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex",
  ogilvie: "Ogilvie",
  venus: "Venus",
  drivalia: "Drivalia",
};

export function OfferPerformance({ className = "" }: OfferPerformanceProps) {
  const [data, setData] = useState<OfferPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"views" | "enquiries" | "conversion" | "date">("views");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("sort", sortBy);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/offers/performance?${params}`);
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
  }, [sortBy, statusFilter]);

  const formatPrice = (price: number | null) =>
    price !== null ? `£${price.toLocaleString()}` : "—";

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
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Offer Performance</h3>
          {data && (
            <span className="text-xs text-white/40">
              {data.summary.totalActiveOffers} active offers
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

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-white/10">
          <SummaryCard
            icon={Eye}
            label="Total Views"
            value={data.summary.totalViews.toLocaleString()}
            trend={data.summary.trend.viewsChange}
          />
          <SummaryCard
            icon={MessageSquare}
            label="Total Enquiries"
            value={data.summary.totalEnquiries.toLocaleString()}
            trend={data.summary.trend.enquiriesChange}
          />
          <SummaryCard
            icon={Target}
            label="Avg Conversion"
            value={`${data.summary.avgConversionRate}%`}
            trend={null}
          />
          <SummaryCard
            icon={Award}
            label="Active Offers"
            value={data.summary.totalActiveOffers.toString()}
            trend={null}
          />
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            <option value="views" className="bg-[#1a1f2a]">Views</option>
            <option value="enquiries" className="bg-[#1a1f2a]">Enquiries</option>
            <option value="conversion" className="bg-[#1a1f2a]">Conversion</option>
            <option value="date" className="bg-[#1a1f2a]">Date</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            <option value="" className="bg-[#1a1f2a]">All</option>
            <option value="active" className="bg-[#1a1f2a]">Active</option>
            <option value="pending" className="bg-[#1a1f2a]">Pending</option>
            <option value="approved" className="bg-[#1a1f2a]">Approved</option>
            <option value="expired" className="bg-[#1a1f2a]">Expired</option>
          </select>
        </div>
      </div>

      {/* Top & Low Performers */}
      {data && (data.summary.topPerformers.length > 0 || data.summary.lowPerformers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-white/10">
          {/* Top Performers */}
          {data.summary.topPerformers.length > 0 && (
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <h4 className="text-xs font-medium text-green-400 uppercase mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {data.summary.topPerformers.slice(0, 3).map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white/80 truncate">
                      {offer.manufacturer} {offer.model}
                    </span>
                    <span className="text-green-400 font-medium">
                      {offer.conversionRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Performers */}
          {data.summary.lowPerformers.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <h4 className="text-xs font-medium text-orange-400 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Needs Attention
              </h4>
              <div className="space-y-2">
                {data.summary.lowPerformers.slice(0, 3).map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-white/80 truncate">
                      {offer.manufacturer} {offer.model}
                    </span>
                    <span className="text-orange-400 font-medium">
                      {offer.conversionRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offers Table */}
      {data && data.offers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-white/50 uppercase">
                  Vehicle
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-white/50 uppercase">
                  Price
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-white/50 uppercase">
                  Views
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-white/50 uppercase">
                  Enquiries
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-white/50 uppercase">
                  Conv %
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-white/50 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-white/50 uppercase">
                  Days Live
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.offers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} formatPrice={formatPrice} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-white/50 text-sm">
          No featured offers to display
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  trend: number | null;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-cyan-400" />
        {trend !== null && (
          <div
            className={`flex items-center gap-0.5 text-xs ${
              trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-white/40"
            }`}
          >
            {trend > 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : trend < 0 ? (
              <ArrowDownRight className="w-3 h-3" />
            ) : null}
            {trend !== 0 && `${Math.abs(trend)}%`}
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function OfferRow({
  offer,
  formatPrice,
}: {
  offer: OfferPerformanceData;
  formatPrice: (n: number | null) => string;
}) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
    pending: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316" },
    approved: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
    expired: { bg: "rgba(107, 114, 128, 0.15)", text: "#6b7280" },
    rejected: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
    inactive: { bg: "rgba(107, 114, 128, 0.15)", text: "#6b7280" },
  };

  const colors = statusColors[offer.status] || statusColors.inactive;

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div>
          <div className="text-sm font-medium text-white">
            {offer.manufacturer} {offer.model}
          </div>
          <div className="text-xs text-white/40">
            {offer.capCode} • {offer.fuelType || "Unknown"}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-white">
          {formatPrice(offer.bestMonthlyPrice)}/mo
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-white">{offer.views.toLocaleString()}</div>
        <div className="text-xs text-white/40">{offer.viewsPerDay}/day</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="text-sm text-white">{offer.enquiries.toLocaleString()}</div>
        <div className="text-xs text-white/40">{offer.enquiriesPerDay}/day</div>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`text-sm font-medium ${
            offer.conversionRate >= 5
              ? "text-green-400"
              : offer.conversionRate >= 2
              ? "text-yellow-400"
              : "text-white/60"
          }`}
        >
          {offer.conversionRate}%
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="px-2 py-1 rounded text-xs font-medium capitalize"
          style={{ background: colors.bg, color: colors.text }}
        >
          {offer.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-white/60">{offer.daysLive} days</span>
      </td>
    </tr>
  );
}
