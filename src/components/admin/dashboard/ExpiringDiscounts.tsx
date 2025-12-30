"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  Tag,
  TrendingDown,
} from "lucide-react";

interface ExpiringDiscount {
  id: string;
  capCode: string;
  make: string;
  model: string;
  derivative: string | null;
  discountPercent: number;
  savingsGbp: number;
  expiresAt: string;
  daysUntilExpiry: number;
  status: "critical" | "warning" | "upcoming";
}

interface ExpiringDiscountsResponse {
  discounts: ExpiringDiscount[];
  summary: {
    expiringSoon: number;
    expiringThisWeek: number;
    expiringThisMonth: number;
    totalSavingsAtRisk: number;
  };
}

interface ExpiringDiscountsProps {
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG = {
  critical: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    label: "Expires today",
  },
  warning: {
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.15)",
    label: "This week",
  },
  upcoming: {
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.15)",
    label: "This month",
  },
};

export function ExpiringDiscounts({ className = "", compact = false }: ExpiringDiscountsProps) {
  const [data, setData] = useState<ExpiringDiscountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/discounts/expiring");
      if (!res.ok) throw new Error("Failed to fetch expiring discounts");

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

  const hasExpiring = data && data.discounts.length > 0;

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
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Expiring Discounts</h3>
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
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center gap-3">
          {data.summary.expiringSoon > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-red-400 font-medium">{data.summary.expiringSoon}</span>
              <span className="text-white/50">today</span>
            </div>
          )}
          {data.summary.expiringThisWeek > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className="text-orange-400 font-medium">{data.summary.expiringThisWeek}</span>
              <span className="text-white/50">this week</span>
            </div>
          )}
          {data.summary.expiringThisMonth > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400 font-medium">{data.summary.expiringThisMonth}</span>
              <span className="text-white/50">this month</span>
            </div>
          )}
          {data.summary.totalSavingsAtRisk > 0 && (
            <div className="flex items-center gap-1 text-xs ml-auto">
              <TrendingDown className="w-3 h-3 text-white/40" />
              <span className="text-white/50">
                £{data.summary.totalSavingsAtRisk.toLocaleString()} at risk
              </span>
            </div>
          )}
        </div>
      )}

      {/* Discount list */}
      {!hasExpiring ? (
        <div className="px-4 py-8 text-center">
          <Tag className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-white/60 text-sm">No discounts expiring soon</p>
          <p className="text-white/40 text-xs mt-1">All manufacturer discounts are current</p>
        </div>
      ) : (
        <div className={compact ? "max-h-[250px] overflow-y-auto" : ""}>
          <div className="divide-y divide-white/5">
            {data.discounts.map((discount) => {
              const statusConfig = STATUS_CONFIG[discount.status];

              return (
                <div
                  key={discount.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                      >
                        {discount.daysUntilExpiry === 0
                          ? "Today"
                          : discount.daysUntilExpiry === 1
                          ? "Tomorrow"
                          : `${discount.daysUntilExpiry}d`}
                      </span>
                      <span className="text-xs text-white/40">
                        {discount.discountPercent}% off
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white truncate">
                      {discount.make} {discount.model}
                    </div>
                    {discount.derivative && (
                      <div className="text-xs text-white/50 truncate">
                        {discount.derivative}
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-green-400">
                      £{discount.savingsGbp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {new Date(discount.expiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer link */}
      {hasExpiring && (
        <a
          href="/admin/discounts"
          className="flex items-center justify-center gap-1 px-4 py-2 border-t border-white/10 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-white/[0.02] transition-colors"
        >
          View all discounts
          <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
