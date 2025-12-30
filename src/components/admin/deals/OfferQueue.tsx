"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Loader2,
  RefreshCw,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type {
  QueueItem,
  QueueSuggestion,
  QueueResponse,
  QueueStatus,
} from "@/app/api/admin/deals/queue/route";

interface OfferQueueProps {
  className?: string;
}

const STATUS_CONFIG: Record<
  QueueStatus,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  pending: { icon: Clock, color: "#f97316", bg: "rgba(249, 115, 22, 0.15)", label: "Pending" },
  approved: { icon: CheckCircle2, color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", label: "Approved" },
  rejected: { icon: XCircle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", label: "Rejected" },
  expired: { icon: AlertTriangle, color: "#6b7280", bg: "rgba(107, 114, 128, 0.15)", label: "Expired" },
};

const PROVIDER_NAMES: Record<string, string> = {
  lex: "Lex Autolease",
  ogilvie: "Ogilvie Fleet",
  venus: "Venus",
  drivalia: "Drivalia",
};

export function OfferQueue({ className = "" }: OfferQueueProps) {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "all">("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");

      const res = await fetch(`/api/admin/deals/queue?${params}`);
      if (!res.ok) throw new Error("Failed to fetch queue");

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
  }, [statusFilter]);

  const handleAction = async (
    action: "approve" | "reject" | "expire" | "add",
    dealId?: string,
    capCode?: string
  ) => {
    const loadingKey = dealId || capCode || "action";
    setActionLoading(loadingKey);

    try {
      const body: Record<string, string | undefined> = { action };
      if (dealId) body.dealId = dealId;
      if (capCode) body.capCode = capCode;
      if (action === "reject" && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }

      const res = await fetch("/api/admin/deals/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      // Reset rejection state
      setRejectingId(null);
      setRejectionReason("");

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: number) => `£${price.toLocaleString()}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !data) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`text-red-400 text-center py-12 ${className}`}>
        {error}
        <button
          onClick={fetchData}
          className="ml-4 text-cyan-400 hover:text-cyan-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard
            label="Pending"
            value={data.stats.pending}
            icon={Clock}
            color="#f97316"
          />
          <StatCard
            label="Approved"
            value={data.stats.approved}
            icon={CheckCircle2}
            color="#22c55e"
          />
          <StatCard
            label="Rejected"
            value={data.stats.rejected}
            icon={XCircle}
            color="#ef4444"
          />
          <StatCard
            label="Expired"
            value={data.stats.expired}
            icon={AlertTriangle}
            color="#6b7280"
          />
          <StatCard
            label="Total Views"
            value={data.stats.totalViews}
            icon={Eye}
            color="#79d5e9"
          />
          <StatCard
            label="Enquiries"
            value={data.stats.totalEnquiries}
            icon={MessageSquare}
            color="#a855f7"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected", "expired"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent"
                }`}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status].label}
              </button>
            )
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Queue Items */}
      {data && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-white">Queue ({data.queue.length})</h3>
          </div>

          {data.queue.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/50">
              No items in queue
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {data.queue.map((item) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  isRejecting={rejectingId === item.id}
                  rejectionReason={rejectionReason}
                  onReject={() => setRejectingId(item.id)}
                  onCancelReject={() => {
                    setRejectingId(null);
                    setRejectionReason("");
                  }}
                  onReasonChange={setRejectionReason}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatPrice={formatPrice}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {data && data.suggestions.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white">
              Suggested Deals ({data.suggestions.length})
            </h3>
            <span className="text-xs text-white/50">High-value opportunities</span>
          </div>

          <div className="divide-y divide-white/5">
            {data.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.capCode}
                suggestion={suggestion}
                onAdd={() => handleAction("add", undefined, suggestion.capCode)}
                isLoading={actionLoading === suggestion.capCode}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
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
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function QueueItemRow({
  item,
  isRejecting,
  rejectionReason,
  onReject,
  onCancelReject,
  onReasonChange,
  onAction,
  actionLoading,
  formatPrice,
  formatDate,
}: {
  item: QueueItem;
  isRejecting: boolean;
  rejectionReason: string;
  onReject: () => void;
  onCancelReject: () => void;
  onReasonChange: (reason: string) => void;
  onAction: (action: "approve" | "reject" | "expire", dealId: string) => void;
  actionLoading: string | null;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
}) {
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;
  const isLoading = actionLoading === item.id;

  return (
    <div className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Vehicle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              <StatusIcon className="w-3 h-3 inline mr-1" />
              {statusConfig.label}
            </span>
            {item.fuelType && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/60">
                {item.fuelType}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-white truncate">
            {item.manufacturer} {item.model}
          </h4>
          {item.variant && (
            <p className="text-sm text-white/50 truncate">{item.variant}</p>
          )}
          <p className="text-xs text-white/40 mt-1">
            CAP: {item.capCode} | Added {formatDate(item.featuredAt)}
            {item.featuredByName && ` by ${item.featuredByName}`}
          </p>
        </div>

        {/* Price Info */}
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {formatPrice(item.bestMonthlyPriceGbp)}/mo
          </div>
          {item.priceChange !== null && item.priceChange !== 0 && (
            <div
              className={`flex items-center justify-end gap-1 text-xs ${
                item.priceChange > 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              {item.priceChange > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.priceChange > 0 ? "+" : ""}
              {formatPrice(item.priceChange)}
            </div>
          )}
          <div className="text-xs text-white/40 mt-1">
            {item.bestTerm}mo / {item.bestMileage?.toLocaleString()}mi
          </div>
          {item.bestProviderCode && (
            <div className="text-xs text-cyan-400">
              {PROVIDER_NAMES[item.bestProviderCode] || item.bestProviderCode}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background:
                item.score >= 80
                  ? "rgba(34, 197, 94, 0.2)"
                  : item.score >= 60
                  ? "rgba(249, 115, 22, 0.2)"
                  : "rgba(107, 114, 128, 0.2)",
              color:
                item.score >= 80
                  ? "#22c55e"
                  : item.score >= 60
                  ? "#f97316"
                  : "#6b7280",
            }}
          >
            {item.score}
          </div>
          <div className="text-[10px] text-white/40 mt-1">Score</div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-center">
          <div>
            <div className="flex items-center gap-1 text-white/60">
              <Eye className="w-3 h-3" />
              <span className="text-sm font-medium">{item.views}</span>
            </div>
            <div className="text-[10px] text-white/40">Views</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-white/60">
              <MessageSquare className="w-3 h-3" />
              <span className="text-sm font-medium">{item.enquiries}</span>
            </div>
            <div className="text-[10px] text-white/40">Enquiries</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {item.status === "pending" && !isRejecting && (
            <>
              <button
                onClick={() => onAction("approve", item.id)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Approve"
                )}
              </button>
              <button
                onClick={onReject}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {item.status === "approved" && (
            <button
              onClick={() => onAction("expire", item.id)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Expire"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Rejection reason input */}
      {isRejecting && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => onAction("reject", item.id)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm Reject"
            )}
          </button>
          <button
            onClick={onCancelReject}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Show rejection reason if rejected */}
      {item.status === "rejected" && item.rejectionReason && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-xs text-red-400">
            Reason: {item.rejectionReason}
          </span>
        </div>
      )}

      {/* Show expiry if set */}
      {item.expiresAt && (
        <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
          <Calendar className="w-3 h-3" />
          Expires: {formatDate(item.expiresAt)}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onAdd,
  isLoading,
  formatPrice,
}: {
  suggestion: QueueSuggestion;
  onAdd: () => void;
  isLoading: boolean;
  formatPrice: (price: number) => string;
}) {
  return (
    <div className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Vehicle Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">
            {suggestion.manufacturer} {suggestion.model}
          </h4>
          {suggestion.variant && (
            <p className="text-sm text-white/50 truncate">{suggestion.variant}</p>
          )}
          <p className="text-xs text-white/40 mt-1">CAP: {suggestion.capCode}</p>
        </div>

        {/* Price Info */}
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {formatPrice(suggestion.bestMonthlyPriceGbp)}/mo
          </div>
          <div className="text-xs text-white/40">
            {suggestion.bestTerm}mo / {suggestion.bestMileage?.toLocaleString()}mi
          </div>
          {suggestion.bestProviderCode && (
            <div className="text-xs text-cyan-400">
              {PROVIDER_NAMES[suggestion.bestProviderCode] ||
                suggestion.bestProviderCode}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              color: "#22c55e",
            }}
          >
            {suggestion.score}
          </div>
          <div className="text-[10px] text-white/40 mt-1">Score</div>
        </div>

        {/* Reason */}
        <div className="max-w-[200px]">
          <div className="text-sm text-amber-400">{suggestion.reason}</div>
          {suggestion.p11dGbp > 0 && (
            <div className="text-xs text-white/40">
              P11D: {formatPrice(suggestion.p11dGbp)}
            </div>
          )}
        </div>

        {/* Add Button */}
        <button
          onClick={onAdd}
          disabled={isLoading}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add to Queue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
