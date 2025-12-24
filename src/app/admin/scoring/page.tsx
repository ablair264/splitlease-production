"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  RefreshCw,
  BarChart3,
  Sliders,
  Car,
  Zap,
  Fuel,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";

interface ScoringConfig {
  config: {
    id: string | null;
    name: string;
    weights: {
      valueScore: number;
      providerCompetition: number;
      rateFreshness: number;
    };
    thresholds: {
      hot: { min: number; label: string };
      great: { min: number; label: string };
      good: { min: number; label: string };
      fair: { min: number; label: string };
      average: { min: number; label: string };
    };
  };
  distribution: Record<string, number>;
  totalVehicles: number;
  sampleVehicles: Array<{
    capCode: string;
    manufacturer: string;
    model: string;
    variant: string | null;
    displayName: string;
    monthlyPriceGbp: number;
    p11dGbp: number;
    score: number;
  }>;
  appliedFilters: {
    contractType: string;
    term: number;
    mileage: number;
  };
}

const DEFAULT_WEIGHTS = {
  valueScore: 70,
  providerCompetition: 20,
  rateFreshness: 10,
};

const CONTRACT_TYPES = [
  { value: "CHNM", label: "CH (No Maint)" },
  { value: "CH", label: "CH (Maint)" },
];

export default function ScoringConfigPage() {
  const [contractType, setContractType] = useState("CHNM");
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ScoringConfig>({
    queryKey: ["scoring-config", contractType, term, mileage],
    queryFn: async () => {
      const params = new URLSearchParams({
        contractType,
        term: term.toString(),
        mileage: mileage.toString(),
      });
      const res = await fetch(`/api/admin/scoring/config?${params}`);
      if (!res.ok) throw new Error("Failed to fetch scoring config");
      const data = await res.json();
      // Initialize weights from config
      if (data.config?.weights) {
        setWeights(data.config.weights);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/scoring/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weights,
          name: "custom",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save config");
      }
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["scoring-config"] });
    },
  });

  const weightsSum = weights.valueScore + weights.providerCompetition + weights.rateFreshness;
  const isValidSum = weightsSum === 100;

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value));

    setWeights((prev) => {
      const otherKeys = (Object.keys(prev) as Array<keyof typeof prev>).filter(k => k !== key);
      const otherSum = otherKeys.reduce((sum, k) => sum + prev[k], 0);
      const remaining = 100 - clampedValue;

      // If other weights are all 0, distribute remaining equally
      if (otherSum === 0) {
        const each = Math.round(remaining / otherKeys.length);
        const newWeights = { ...prev, [key]: clampedValue };
        otherKeys.forEach((k, i) => {
          // Give any rounding remainder to the last key
          if (i === otherKeys.length - 1) {
            newWeights[k] = remaining - (each * (otherKeys.length - 1));
          } else {
            newWeights[k] = each;
          }
        });
        return newWeights;
      }

      // Distribute remaining proportionally to other weights
      const newWeights = { ...prev, [key]: clampedValue };
      let distributed = 0;

      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          // Last key gets the remainder to ensure sum is exactly 100
          newWeights[k] = remaining - distributed;
        } else {
          const proportion = prev[k] / otherSum;
          const newValue = Math.round(remaining * proportion);
          newWeights[k] = newValue;
          distributed += newValue;
        }
      });

      return newWeights;
    });
    setHasChanges(true);
  };

  const distribution = data?.distribution || {};
  const totalVehicles = data?.totalVehicles || 0;

  const getDistributionPercentage = (tier: string) => {
    const count = distribution[tier] || 0;
    return totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scoring Configuration</h1>
          <p className="text-sm text-gray-400">
            Configure how vehicle deals are scored and tiered
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Contract Type Toggle */}
          <div className="flex items-center gap-2 bg-[#121821] rounded-xl p-1 border border-gray-800">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setContractType(type.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  contractType === type.value
                    ? "bg-cyan-500 text-[#0f1419]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Save Button */}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || !isValidSum || saveMutation.isPending}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              hasChanges && isValidSum
                ? "bg-cyan-500 text-[#0f1419] hover:bg-cyan-400"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            )}
          >
            {saveMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
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
        {/* Weights Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161c24] rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Sliders className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Score Weights</h2>
              <span
                className={cn(
                  "ml-auto text-sm font-medium px-3 py-1 rounded-full",
                  isValidSum
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                Total: {weightsSum}%
                {!isValidSum && " (must equal 100)"}
              </span>
            </div>

            <div className="space-y-6">
              {/* Value Score Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium text-white">
                      Value Score
                    </label>
                    <p className="text-xs text-gray-500">
                      Based on monthly price relative to P11D value
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.valueScore}
                      onChange={(e) =>
                        handleWeightChange("valueScore", parseInt(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white text-center"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.valueScore}
                  onChange={(e) =>
                    handleWeightChange("valueScore", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Provider Competition Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium text-white">
                      Provider Competition
                    </label>
                    <p className="text-xs text-gray-500">
                      More providers = more competition = better for buyers
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.providerCompetition}
                      onChange={(e) =>
                        handleWeightChange(
                          "providerCompetition",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white text-center"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.providerCompetition}
                  onChange={(e) =>
                    handleWeightChange("providerCompetition", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Rate Freshness Weight */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium text-white">
                      Rate Freshness
                    </label>
                    <p className="text-xs text-gray-500">
                      Newer rates are more reliable and accurate
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.rateFreshness}
                      onChange={(e) =>
                        handleWeightChange("rateFreshness", parseInt(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white text-center"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.rateFreshness}
                  onChange={(e) =>
                    handleWeightChange("rateFreshness", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Sample Vehicles */}
          <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
              <Car className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Sample Scores</h2>
              <span className="text-xs text-gray-500 ml-auto">
                {term}mo / {mileage / 1000}k miles
              </span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.sampleVehicles && data.sampleVehicles.length > 0 ? (
              <div className="divide-y divide-gray-800">
                {data.sampleVehicles.slice(0, 10).map((vehicle) => (
                  <div
                    key={vehicle.capCode}
                    className="px-5 py-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {vehicle.displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {vehicle.manufacturer}
                      </div>
                    </div>
                    <div className="text-right w-24">
                      <div className="text-sm text-white">
                        £{vehicle.monthlyPriceGbp}/mo
                      </div>
                      <div className="text-xs text-gray-500">
                        P11D £{vehicle.p11dGbp.toLocaleString()}
                      </div>
                    </div>
                    <ScoreBadge score={vehicle.score} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No vehicles found
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
                {/* Hot */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2">
                      <ScoreBadge score={85} size="sm" showIcon={false} />
                      <span className="text-gray-400">Hot (80+)</span>
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

                {/* Great */}
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

                {/* Good */}
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

                {/* Fair */}
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

                {/* Average */}
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
                <p className="font-medium text-cyan-400 mb-1">How Scoring Works</p>
                <p>
                  The final score is calculated as a weighted average of the three
                  components. Value Score measures monthly cost vs. P11D value.
                  Provider Competition rewards vehicles available from multiple
                  funders. Rate Freshness ensures newer data is prioritized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
