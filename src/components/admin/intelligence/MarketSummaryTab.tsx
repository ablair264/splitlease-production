"use client";

import { useState, useEffect } from "react";
import { Loader2, Clock, Sparkles } from "lucide-react";

interface MarketSummaryTabProps {
  fetchResult: Record<string, number> | null;
}

interface Snapshot {
  id: string;
  source: string;
  snapshotDate: string;
  totalDealsCount: number;
  avgMonthlyPriceGbp: number | null;
}

export function MarketSummaryTab({ fetchResult }: MarketSummaryTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Load deals to get snapshot info
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/intelligence/deals?pageSize=1");
        if (response.ok) {
          const data = await response.json();
          setSnapshots(data.snapshots || []);
        }
      } catch (error) {
        console.error("Failed to load market data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchResult]);

  // Generate AI summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const response = await fetch("/api/admin/intelligence/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateSummary: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.content);
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Auto-generate summary on mount if we have data
  useEffect(() => {
    if (snapshots.length > 0 && !summary && !isGeneratingSummary) {
      handleGenerateSummary();
    }
  }, [snapshots]);

  const sources = [
    { key: "leasing_com", label: "Leasing.com", color: "#79d5e9" },
    { key: "leaseloco", label: "LeaseLoco", color: "#61bc8e" },
    { key: "appliedleasing", label: "Applied Leasing", color: "#f59e0b" },
    { key: "selectcarleasing", label: "Select Car Leasing", color: "#a855f7" },
    { key: "vipgateway", label: "VIP Gateway", color: "#ef4444" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#79d5e9] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {sources.map((source) => {
          const snapshot = snapshots.find((s) => s.source === source.key);
          const count =
            snapshot?.totalDealsCount ?? fetchResult?.[source.key] ?? 0;
          return (
            <div
              key={source.key}
              className="rounded-xl p-4"
              style={{
                background: "rgba(26, 31, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: source.color }}
                />
                <span className="text-xs text-white/60 font-medium">
                  {source.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-white/50">deals tracked</div>
              {snapshot?.avgMonthlyPriceGbp && (
                <div className="mt-2 text-sm text-white/70">
                  Avg: £{snapshot.avgMonthlyPriceGbp}/mo
                </div>
              )}
            </div>
          );
        })}

        {/* Freshness Card */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-white/60" />
            <span className="text-xs text-white/60 font-medium">
              Data Freshness
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {snapshots.length > 0
              ? getTimeAgo(
                  new Date(
                    Math.max(
                      ...snapshots.map((s) =>
                        new Date(s.snapshotDate).getTime()
                      )
                    )
                  )
                )
              : "—"}
          </div>
          <div className="text-xs text-white/50">last updated</div>
        </div>
      </div>

      {/* AI Summary */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#79d5e9]" />
            <h3 className="text-sm font-semibold text-white">Market Summary</h3>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="text-xs text-[#79d5e9] hover:text-[#79d5e9]/80 disabled:opacity-50"
          >
            {isGeneratingSummary ? "Generating..." : "Regenerate"}
          </button>
        </div>

        {isGeneratingSummary ? (
          <div className="flex items-center gap-3 py-8">
            <Loader2 className="w-5 h-5 text-[#79d5e9] animate-spin" />
            <span className="text-sm text-white/60">
              Analyzing market data...
            </span>
          </div>
        ) : summary ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/50 mb-4">
              No market data available yet.
            </p>
            <p className="text-xs text-white/40">
              Click "Fetch Data" to load competitor deals.
            </p>
          </div>
        ) : (
          <div className="text-sm text-white/60">
            Click "Regenerate" to get an AI-powered market summary.
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
