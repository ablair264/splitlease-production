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
  Tag,
  Copy,
  Check,
} from "lucide-react";
import type { CompetitorComparison, FleetMarqueOtr } from "@/app/api/admin/rates/[capCode]/competitors/route";

interface CompetitorOverlayProps {
  capCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const POSITION_CONFIG: Record<string, { icon: typeof TrendingDown; color: string; label: string }> = {
  lowest: { icon: Trophy, color: "#22c55e", label: "Cheapest" },
  "below-avg": { icon: TrendingDown, color: "#3b82f6", label: "Below Avg" },
  average: { icon: Minus, color: "#a855f7", label: "Average" },
  "above-avg": { icon: TrendingUp, color: "#f97316", label: "Above Avg" },
  highest: { icon: AlertTriangle, color: "#ef4444", label: "Most Expensive" },
  only: { icon: Minus, color: "#64748b", label: "No Data" },
};

export function CompetitorOverlay({ capCode, isOpen, onClose }: CompetitorOverlayProps) {
  const [data, setData] = useState<CompetitorComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedOtr, setCopiedOtr] = useState(false);

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

  const handleCopyOtr = () => {
    if (data?.fleetMarqueOtr?.discountedPrice) {
      navigator.clipboard.writeText(data.fleetMarqueOtr.discountedPrice.toString());
      setCopiedOtr(true);
      setTimeout(() => setCopiedOtr(false), 2000);
    }
  };

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

      {/* Overlay panel - narrower for compact design */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0f1419] border-l border-white/10 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f1419]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Market Comparison</h2>
            <p className="text-xs text-white/50 font-mono">{capCode}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {/* Vehicle + Position - Compact Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium text-sm">
                    {data.manufacturer} {data.model}
                  </h3>
                  {data.variant && (
                    <p className="text-white/50 text-xs truncate max-w-[250px]">{data.variant}</p>
                  )}
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                  style={{ background: `${positionConfig.color}20`, color: positionConfig.color }}
                >
                  <PositionIcon className="w-3.5 h-3.5" />
                  {positionConfig.label}
                </div>
              </div>

              {/* Fleet Marque OTR - PROMINENT */}
              {data.fleetMarqueOtr && (
                <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 text-xs font-medium">Fleet Marque OTR</span>
                    </div>
                    {data.fleetMarqueOtr.buildUrl && (
                      <a
                        href={data.fleetMarqueOtr.buildUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/60 hover:text-amber-400 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white">
                        £{data.fleetMarqueOtr.discountedPrice?.toLocaleString()}
                      </span>
                      {data.fleetMarqueOtr.capPrice && (
                        <span className="ml-2 text-white/40 text-sm line-through">
                          £{data.fleetMarqueOtr.capPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleCopyOtr}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors"
                    >
                      {copiedOtr ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedOtr ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    {data.fleetMarqueOtr.discountPercent && (
                      <span className="text-green-400">
                        -{data.fleetMarqueOtr.discountPercent.toFixed(1)}% discount
                      </span>
                    )}
                    {data.fleetMarqueOtr.savings && (
                      <span className="text-white/50">
                        Saving £{data.fleetMarqueOtr.savings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* No Fleet Marque data */}
              {!data.fleetMarqueOtr && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                  <Tag className="w-4 h-4 text-white/30 mx-auto mb-1" />
                  <p className="text-white/40 text-xs">No Fleet Marque pricing available</p>
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 rounded p-2">
                  <div className="text-white/40 text-[10px] mb-0.5">Our Best</div>
                  <div className="text-cyan-400 font-semibold text-sm">£{data.summary.ourBestPrice}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-white/40 text-[10px] mb-0.5">Mkt Min</div>
                  <div className="text-green-400 font-semibold text-sm">£{data.summary.marketMin}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-white/40 text-[10px] mb-0.5">Mkt Avg</div>
                  <div className="text-white font-semibold text-sm">£{data.summary.marketAvg}</div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <div className="text-white/40 text-[10px] mb-0.5">Mkt Max</div>
                  <div className="text-red-400 font-semibold text-sm">£{data.summary.marketMax}</div>
                </div>
              </div>

              {/* Our Rates Table */}
              <div>
                <h4 className="text-white/60 text-xs font-medium mb-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Our Rates ({data.ourPrices.length})
                </h4>
                <div className="border border-white/10 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 text-white/50">
                        <th className="px-2 py-1.5 text-left font-medium">Funder</th>
                        <th className="px-2 py-1.5 text-center font-medium">Term</th>
                        <th className="px-2 py-1.5 text-center font-medium">Miles</th>
                        <th className="px-2 py-1.5 text-center font-medium">Type</th>
                        <th className="px-2 py-1.5 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.ourPrices.map((price, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-2 py-1.5 text-white">{price.providerName}</td>
                          <td className="px-2 py-1.5 text-center text-white/70">{price.term}m</td>
                          <td className="px-2 py-1.5 text-center text-white/70">{(price.mileage / 1000).toFixed(0)}k</td>
                          <td className="px-2 py-1.5 text-center text-white/50">{price.contractType}</td>
                          <td className="px-2 py-1.5 text-right text-cyan-400 font-medium">£{price.monthlyPriceGbp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Competitor Table */}
              <div>
                <h4 className="text-white/60 text-xs font-medium mb-2 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Competitors ({data.competitorPrices.length})
                </h4>
                {data.competitorPrices.length === 0 ? (
                  <div className="bg-white/5 rounded p-3 text-center text-white/40 text-xs">
                    No competitor data found
                  </div>
                ) : (
                  <div className="border border-white/10 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/5 text-white/50">
                          <th className="px-2 py-1.5 text-left font-medium">Source</th>
                          <th className="px-2 py-1.5 text-center font-medium">Term</th>
                          <th className="px-2 py-1.5 text-center font-medium">Miles</th>
                          <th className="px-2 py-1.5 text-center font-medium">Date</th>
                          <th className="px-2 py-1.5 text-right font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.competitorPrices
                          .sort((a, b) => a.monthlyPriceGbp - b.monthlyPriceGbp)
                          .map((comp, idx) => {
                            const isCheaper = comp.monthlyPriceGbp < data.summary.ourBestPrice;
                            const isMore = comp.monthlyPriceGbp > data.summary.ourBestPrice;
                            return (
                              <tr key={idx} className="hover:bg-white/[0.02]">
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-white">{comp.sourceName}</span>
                                    {isCheaper && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">Beat</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 text-center text-white/70">
                                  {comp.term ? `${comp.term}m` : "-"}
                                </td>
                                <td className="px-2 py-1.5 text-center text-white/70">
                                  {comp.mileage ? `${(comp.mileage / 1000).toFixed(0)}k` : "-"}
                                </td>
                                <td className="px-2 py-1.5 text-center text-white/40">
                                  {new Date(comp.snapshotDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                </td>
                                <td className="px-2 py-1.5 text-right font-medium" style={{ color: isCheaper ? "#ef4444" : isMore ? "#22c55e" : "#ffffff" }}>
                                  £{comp.monthlyPriceGbp}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Delta */}
              {data.summary.priceDeltaPercent !== 0 && (
                <div className="text-center text-xs">
                  <span className="text-white/40">vs Market Avg: </span>
                  <span
                    className="font-medium"
                    style={{ color: data.summary.priceDeltaPercent < 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {data.summary.priceDeltaPercent > 0 ? "+" : ""}
                    {data.summary.priceDeltaPercent}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
