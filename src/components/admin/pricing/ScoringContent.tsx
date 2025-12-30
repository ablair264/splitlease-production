"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Car,
  Zap,
  Fuel,
  Info,
  TrendingUp,
  Coins,
  Award,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";

interface ScoreBreakdown {
  valueScore: number;
  efficiencyBonus: number;
  affordabilityMod: number;
  brandBonus: number;
  costRatio: number;
  totalPayments: number;
}

interface ScoringConfig {
  config: {
    id: string | null;
    name: string;
  };
  distribution: Record<string, number>;
  totalVehicles: number;
  sampleVehicles: Array<{
    capCode: string;
    manufacturer: string;
    model: string;
    variant: string | null;
    fuelType: string | null;
    displayName: string;
    monthlyPriceGbp: number;
    p11dGbp: number;
    score: number;
    scoreBreakdown: ScoreBreakdown | null;
  }>;
  appliedFilters: {
    contractType: string;
    term: number;
    mileage: number;
  };
}

const CONTRACT_TYPES = [
  { value: "CHNM", label: "CH (No Maint)" },
  { value: "CH", label: "CH (Maint)" },
  { value: "PCHNM", label: "PCH (No Maint)" },
  { value: "PCH", label: "PCH (Maint)" },
];

const TERMS = [24, 36, 48, 60];
const MILEAGES = [5000, 8000, 10000, 15000, 20000];

export default function ScoringContent() {
  const [contractType, setContractType] = useState("CHNM");
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);

  const { data, isLoading, error } = useQuery<ScoringConfig>({
    queryKey: ["scoring-config", contractType, term, mileage],
    queryFn: async () => {
      const params = new URLSearchParams({
        contractType,
        term: term.toString(),
        mileage: mileage.toString(),
      });
      const res = await fetch(`/api/admin/scoring/config?${params}`);
      if (!res.ok) throw new Error("Failed to fetch scoring config");
      return res.json();
    },
  });

  const distribution = data?.distribution || {};
  const totalVehicles = data?.totalVehicles || 0;

  const getDistributionPercentage = (tier: string) => {
    const count = distribution[tier] || 0;
    return totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;
  };

  // Format modifier with sign
  const formatModifier = (val: number) => {
    if (val > 0) return `+${val}`;
    if (val < 0) return `${val}`;
    return "0";
  };

  // Get color for modifier
  const getModifierColor = (val: number) => {
    if (val > 0) return "text-emerald-400";
    if (val < 0) return "text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="space-y-6 p-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Composite Scoring</h2>
          <p className="text-sm text-gray-400">
            How vehicle deals are scored using the composite formula
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Contract Type Toggle */}
          <div className="flex items-center gap-1 bg-[#121821] rounded-xl p-1 border border-gray-800">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setContractType(type.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  contractType === type.value
                    ? "bg-cyan-500 text-[#0f1419]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error instanceof Error ? error.message : "An error occurred"}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scoring Formula Explanation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Formula Card */}
          <div className="bg-[#161c24] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Scoring Formula</h2>
            </div>

            <div className="bg-[#0f1419] rounded-lg p-4 mb-6 font-mono text-sm">
              <div className="text-cyan-400 mb-2">Final Score = </div>
              <div className="pl-4 space-y-1 text-gray-300">
                <div><span className="text-blue-400">Value Score</span> <span className="text-gray-500">(0-100)</span></div>
                <div>+ <span className="text-emerald-400">Efficiency Bonus</span> <span className="text-gray-500">(0-15)</span></div>
                <div>+ <span className="text-yellow-400">Affordability Mod</span> <span className="text-gray-500">(-10 to +10)</span></div>
                <div>+ <span className="text-purple-400">Brand Bonus</span> <span className="text-gray-500">(0-10)</span></div>
              </div>
              <div className="mt-3 text-gray-500 text-xs">
                Clamped to 0-100 range
              </div>
            </div>

            <div className="space-y-4">
              {/* Value Score */}
              <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium text-white">Value Score</h3>
                  <span className="text-xs text-gray-500 ml-auto">0-100 points</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Based on cost ratio: <code className="text-cyan-400 bg-gray-800 px-1 rounded">totalLeaseCost / basicListPrice</code>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-emerald-500/10 p-2 rounded text-center">
                    <div className="text-emerald-400 font-semibold">&lt;20%</div>
                    <div className="text-gray-500">95 pts</div>
                  </div>
                  <div className="bg-teal-500/10 p-2 rounded text-center">
                    <div className="text-teal-400 font-semibold">20-28%</div>
                    <div className="text-gray-500">80-95 pts</div>
                  </div>
                  <div className="bg-cyan-500/10 p-2 rounded text-center">
                    <div className="text-cyan-400 font-semibold">28-38%</div>
                    <div className="text-gray-500">65-80 pts</div>
                  </div>
                  <div className="bg-yellow-500/10 p-2 rounded text-center">
                    <div className="text-yellow-400 font-semibold">38-48%</div>
                    <div className="text-gray-500">50-65 pts</div>
                  </div>
                </div>
              </div>

              {/* Efficiency Bonus */}
              <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-medium text-white">Efficiency Bonus</h3>
                  <span className="text-xs text-gray-500 ml-auto">+0-15 points</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Rewards EVs, hybrids, and fuel-efficient vehicles
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-emerald-500/10 p-2 rounded text-center">
                    <div className="text-emerald-400 font-semibold">EV (300+ mi)</div>
                    <div className="text-gray-500">+15 pts</div>
                  </div>
                  <div className="bg-teal-500/10 p-2 rounded text-center">
                    <div className="text-teal-400 font-semibold">PHEV</div>
                    <div className="text-gray-500">+8 pts</div>
                  </div>
                  <div className="bg-cyan-500/10 p-2 rounded text-center">
                    <div className="text-cyan-400 font-semibold">&gt;60 MPG</div>
                    <div className="text-gray-500">+5 pts</div>
                  </div>
                </div>
              </div>

              {/* Affordability Modifier */}
              <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <Coins className="h-5 w-5 text-yellow-400" />
                  <h3 className="font-medium text-white">Affordability Modifier</h3>
                  <span className="text-xs text-gray-500 ml-auto">-10 to +10 points</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Adjusts for absolute monthly cost (ex-VAT)
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-emerald-500/10 p-2 rounded text-center">
                    <div className="text-emerald-400 font-semibold">&lt;£200</div>
                    <div className="text-gray-500">+10 pts</div>
                  </div>
                  <div className="bg-teal-500/10 p-2 rounded text-center">
                    <div className="text-teal-400 font-semibold">£200-300</div>
                    <div className="text-gray-500">+5 pts</div>
                  </div>
                  <div className="bg-yellow-500/10 p-2 rounded text-center">
                    <div className="text-yellow-400 font-semibold">£500-700</div>
                    <div className="text-gray-500">-5 pts</div>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded text-center">
                    <div className="text-red-400 font-semibold">&gt;£1000</div>
                    <div className="text-gray-500">-10 pts</div>
                  </div>
                </div>
              </div>

              {/* Brand Bonus */}
              <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-800">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-5 w-5 text-purple-400" />
                  <h3 className="font-medium text-white">Brand Premium Bonus</h3>
                  <span className="text-xs text-gray-500 ml-auto">+0-10 points</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Rewards premium/aspirational brands at accessible prices
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-purple-500/10 p-2 rounded text-center">
                    <div className="text-purple-400 font-semibold">Premium &lt;£400</div>
                    <div className="text-gray-500">+10 pts (BMW, Mercedes, Audi...)</div>
                  </div>
                  <div className="bg-pink-500/10 p-2 rounded text-center">
                    <div className="text-pink-400 font-semibold">Aspirational &lt;£350</div>
                    <div className="text-gray-500">+6 pts (Volvo, Mini, Alfa...)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Vehicles */}
          <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
              <Car className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Sample Scores</h2>
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={term}
                  onChange={(e) => setTerm(parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>{t} months</option>
                  ))}
                </select>
                <select
                  value={mileage}
                  onChange={(e) => setMileage(parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                >
                  {MILEAGES.map((m) => (
                    <option key={m} value={m}>{(m / 1000)}k miles</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-800/50 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.sampleVehicles && data.sampleVehicles.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {data.sampleVehicles.slice(0, 10).map((vehicle) => (
                  <div
                    key={vehicle.capCode}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {vehicle.displayName}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{vehicle.manufacturer}</span>
                        {vehicle.fuelType && (
                          <>
                            <span>•</span>
                            <span className={cn(
                              vehicle.fuelType.toLowerCase().includes("electric") && "text-emerald-400",
                              vehicle.fuelType.toLowerCase().includes("hybrid") && "text-teal-400"
                            )}>
                              {vehicle.fuelType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right w-24">
                      <div className="text-sm text-white">
                        £{vehicle.monthlyPriceGbp}/mo
                      </div>
                      <div className="text-xs text-gray-500">
                        P11D £{vehicle.p11dGbp?.toLocaleString()}
                      </div>
                    </div>
                    {/* Score breakdown */}
                    {vehicle.scoreBreakdown ? (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-blue-400">{vehicle.scoreBreakdown.valueScore}</span>
                          <span className={getModifierColor(vehicle.scoreBreakdown.efficiencyBonus)}>
                            {formatModifier(vehicle.scoreBreakdown.efficiencyBonus)}
                          </span>
                          <span className={getModifierColor(vehicle.scoreBreakdown.affordabilityMod)}>
                            {formatModifier(vehicle.scoreBreakdown.affordabilityMod)}
                          </span>
                          <span className={getModifierColor(vehicle.scoreBreakdown.brandBonus)}>
                            {formatModifier(vehicle.scoreBreakdown.brandBonus)}
                          </span>
                          <span className="text-gray-500">=</span>
                        </div>
                        <ScoreBadge score={vehicle.score} size="sm" />
                      </div>
                    ) : (
                      <ScoreBadge score={vehicle.score} size="sm" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No vehicles found for this configuration
              </div>
            )}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="space-y-6">
          <div className="bg-[#161c24] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Distribution</h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Exceptional (80+) */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={85} size="sm" showIcon={false} />
                      <span className="text-gray-400">Exceptional (80+)</span>
                    </span>
                    <span className="text-gray-500">
                      {distribution.hot || 0} ({getDistributionPercentage("hot")}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${getDistributionPercentage("hot")}%` }}
                    />
                  </div>
                </div>

                {/* Great (65-79) */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={70} size="sm" showIcon={false} />
                      <span className="text-gray-400">Great (65-79)</span>
                    </span>
                    <span className="text-gray-500">
                      {distribution.great || 0} ({getDistributionPercentage("great")}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${getDistributionPercentage("great")}%` }}
                    />
                  </div>
                </div>

                {/* Good (50-64) */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={55} size="sm" showIcon={false} />
                      <span className="text-gray-400">Good (50-64)</span>
                    </span>
                    <span className="text-gray-500">
                      {distribution.good || 0} ({getDistributionPercentage("good")}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${getDistributionPercentage("good")}%` }}
                    />
                  </div>
                </div>

                {/* Fair (40-49) */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={45} size="sm" showIcon={false} />
                      <span className="text-gray-400">Fair (40-49)</span>
                    </span>
                    <span className="text-gray-500">
                      {distribution.fair || 0} ({getDistributionPercentage("fair")}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: `${getDistributionPercentage("fair")}%` }}
                    />
                  </div>
                </div>

                {/* Average (<40) */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={30} size="sm" showIcon={false} />
                      <span className="text-gray-400">Average (&lt;40)</span>
                    </span>
                    <span className="text-gray-500">
                      {distribution.average || 0} ({getDistributionPercentage("average")}%)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-500 rounded-full transition-all"
                      style={{ width: `${getDistributionPercentage("average")}%` }}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Vehicles</span>
                    <span className="text-white font-medium">
                      {totalVehicles.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-300/80">
                <p className="font-medium text-cyan-400 mb-1">Composite Scoring</p>
                <p>
                  The score is calculated using an additive formula. Each component
                  contributes independently: Value Score measures cost efficiency,
                  Efficiency Bonus rewards green vehicles, Affordability adjusts for
                  absolute cost, and Brand Bonus rewards premium value.
                </p>
              </div>
            </div>
          </div>

          {/* Recalculation Note */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex gap-3">
              <Fuel className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-400">
                <p className="font-medium text-gray-300 mb-1">Scores Updated Automatically</p>
                <p>
                  Scores are recalculated when rates are imported. To manually
                  recalculate all scores, run: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">npx tsx scripts/recalculate-scores-fast.ts</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
