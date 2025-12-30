"use client";

import { useState, useEffect } from "react";
import {
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  Trophy,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Loader2,
} from "lucide-react";
import type { CompetitorComparison } from "@/app/api/admin/rates/[capCode]/competitors/route";

interface CompetitorOverlayProps {
  capCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const POSITION_CONFIG: Record<string, { icon: typeof TrendingDown; color: string; bg: string }> = {
  lowest: { icon: Trophy, color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
  "below-avg": { icon: TrendingDown, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
  average: { icon: Minus, color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  "above-avg": { icon: TrendingUp, color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  highest: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  only: { icon: Minus, color: "#64748b", bg: "rgba(100, 116, 139, 0.15)" },
};

export function CompetitorOverlay({ capCode, isOpen, onClose }: CompetitorOverlayProps) {
  const [data, setData] = useState<CompetitorComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !capCode) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/rates/${encodeURIComponent(capCode)}/competitors`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch competitor data");
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
  }, [isOpen, capCode]);

  if (!isOpen) return null;

  const positionConfig = data ? POSITION_CONFIG[data.summary.ourPosition] || POSITION_CONFIG.only : POSITION_CONFIG.only;
  const PositionIcon = positionConfig.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Overlay panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0f1419] border-l border-white/10 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f1419]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Competitor Comparison</h2>
            <p className="text-sm text-white/50 font-mono">{capCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              {/* Vehicle Info */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-white font-medium">
                  {data.manufacturer} {data.model}
                </h3>
                {data.variant && (
                  <p className="text-white/60 text-sm mt-1">{data.variant}</p>
                )}
              </div>

              {/* Summary Card */}
              <div
                className="rounded-lg p-4 border"
                style={{
                  background: positionConfig.bg,
                  borderColor: `${positionConfig.color}40`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${positionConfig.color}20` }}
                  >
                    <PositionIcon className="w-5 h-5" style={{ color: positionConfig.color }} />
                  </div>
                  <div>
                    <div className="text-white font-semibold capitalize">
                      {data.summary.ourPosition.replace("-", " ")} in Market
                    </div>
                    <div className="text-white/60 text-sm">
                      {data.competitorPrices.length} competitor{data.competitorPrices.length !== 1 ? "s" : ""} found
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-white/50 text-xs mb-1">Our Best</div>
                    <div className="text-white font-semibold">
                      £{data.summary.ourBestPrice}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/50 text-xs mb-1">Market Min</div>
                    <div className="text-green-400 font-semibold">
                      £{data.summary.marketMin}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/50 text-xs mb-1">Market Avg</div>
                    <div className="text-white font-semibold">
                      £{data.summary.marketAvg}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/50 text-xs mb-1">Market Max</div>
                    <div className="text-red-400 font-semibold">
                      £{data.summary.marketMax}
                    </div>
                  </div>
                </div>

                {data.summary.priceDeltaPercent !== 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-center">
                    <span className="text-white/60 text-sm">vs Market Average: </span>
                    <span
                      className="font-semibold"
                      style={{
                        color: data.summary.priceDeltaPercent < 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {data.summary.priceDeltaPercent > 0 ? "+" : ""}
                      {data.summary.priceDeltaPercent}%
                    </span>
                  </div>
                )}
              </div>

              {/* Our Prices */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  Our Prices
                </h3>
                <div className="space-y-2">
                  {data.ourPrices.map((price, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-white font-medium">{price.providerName}</div>
                        <div className="text-white/50 text-xs">
                          {price.term} months • {price.mileage?.toLocaleString()} mi/yr • {price.contractType}
                        </div>
                      </div>
                      <div className="text-cyan-400 font-semibold">
                        £{price.monthlyPriceGbp}/mo
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitor Prices */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  Competitor Prices
                </h3>
                {data.competitorPrices.length === 0 ? (
                  <div className="bg-white/5 rounded-lg p-4 text-center text-white/50">
                    No competitor data available for this vehicle
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.competitorPrices
                      .sort((a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp)
                      .map((comp, idx) => {
                        const isCheaperThanUs = comp.monthlyPriceGbp < data.summary.ourBestPrice;
                        const isMoreExpensive = comp.monthlyPriceGbp > data.summary.ourBestPrice;

                        return (
                          <div
                            key={idx}
                            className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{comp.sourceName}</span>
                                {isCheaperThanUs && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                    Beating us
                                  </span>
                                )}
                                {isMoreExpensive && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                    Higher
                                  </span>
                                )}
                              </div>
                              <div className="text-white/50 text-xs flex items-center gap-3 mt-1">
                                {comp.term && <span>{comp.term} months</span>}
                                {comp.mileage && <span>{comp.mileage.toLocaleString()} mi/yr</span>}
                                {comp.leaseType && (
                                  <span className="capitalize">{comp.leaseType}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className="font-semibold"
                                style={{
                                  color: isCheaperThanUs ? "#ef4444" : isMoreExpensive ? "#22c55e" : "#ffffff",
                                }}
                              >
                                £{comp.monthlyPriceGbp}/mo
                              </div>
                              <div className="text-white/40 text-[10px] flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(comp.snapshotDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Data freshness note */}
              <div className="text-center text-white/40 text-xs pt-4 border-t border-white/10">
                Competitor data from the last 14 days
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
