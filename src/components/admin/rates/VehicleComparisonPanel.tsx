"use client";

import { useQuery } from "@tanstack/react-query";
import { Car, Zap, Fuel, X, Crown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";

interface VehicleComparisonPanelProps {
  capCode: string;
  manufacturer: string;
  contractType: string;
  onClose: () => void;
}

interface GridRate {
  term: number;
  mileage: number;
  key: string;
  priceGbp: number | null;
  isBestForConfig: boolean;
  isGlobalBest: boolean;
}

interface ProviderGrid {
  providerCode: string;
  providerName: string;
  rates: GridRate[];
}

export function VehicleComparisonPanel({
  capCode,
  manufacturer,
  contractType,
  onClose,
}: VehicleComparisonPanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["vehicle-comparison", capCode, contractType],
    queryFn: async () => {
      const params = new URLSearchParams({ contractType });
      const res = await fetch(
        `/api/admin/rates/vehicles/${encodeURIComponent(capCode)}/comparison?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1f2a] rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700/50 rounded w-2/3" />
          <div className="h-64 bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data?.vehicle) {
    return (
      <div className="bg-[#1a1f2a] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400">Error loading vehicle</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const { vehicle, grid, globalBest } = data;

  return (
    <div className="bg-[#1a1f2a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Vehicle Image */}
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt=""
              className="w-20 h-14 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-14 bg-gray-800 rounded-lg flex items-center justify-center">
              <Car className="h-8 w-8 text-gray-600" />
            </div>
          )}

          {/* Vehicle Info */}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{manufacturer}</div>
            <h3 className="text-lg font-semibold text-white">
              {vehicle.displayName}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
              {vehicle.fuelType && (
                <span className="flex items-center gap-1">
                  {vehicle.fuelType === "Electric" ? (
                    <Zap className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Fuel className="h-3.5 w-3.5" />
                  )}
                  {vehicle.fuelType}
                </span>
              )}
              {vehicle.p11dGbp && (
                <span>P11D: £{vehicle.p11dGbp.toLocaleString()}</span>
              )}
              <span className="text-xs text-gray-600">{vehicle.capCode}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ScoreBadge score={vehicle.bestScore} size="lg" />
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Global Best Banner */}
      {globalBest && (
        <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-3">
          <Crown className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-400 font-medium">
            Best Deal: £{globalBest.priceGbp}/mo
          </span>
          <span className="text-emerald-400/70 text-sm">
            via {globalBest.providerName} ({globalBest.config.replace("/", " months / ")} miles)
          </span>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-[#1a1f2a]">
                Provider
              </th>
              {grid?.terms?.map((term: number) => (
                <th
                  key={term}
                  colSpan={grid.mileages?.length || 1}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-800"
                >
                  {term} months
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-2 text-left text-xs text-gray-600 sticky left-0 bg-[#1a1f2a]">
                Mileage
              </th>
              {grid?.terms?.map((term: number) =>
                grid.mileages?.map((m: { value: number; label: string }) => (
                  <th
                    key={`${term}-${m.value}`}
                    className="px-3 py-2 text-center text-xs text-gray-600 border-l border-gray-800/50"
                  >
                    {m.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {grid?.providers?.map((provider: ProviderGrid) => (
              <tr key={provider.providerCode} className="hover:bg-gray-800/30">
                <td className="px-4 py-3 text-sm font-medium text-white sticky left-0 bg-[#1a1f2a]">
                  {provider.providerName}
                </td>
                {provider.rates.map((rate: GridRate) => (
                  <td
                    key={rate.key}
                    className={cn(
                      "px-3 py-3 text-center text-sm border-l border-gray-800/50",
                      rate.isGlobalBest && "bg-emerald-500/10",
                      rate.isBestForConfig && !rate.isGlobalBest && "bg-cyan-500/5"
                    )}
                  >
                    {rate.priceGbp ? (
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "font-medium",
                            rate.isGlobalBest
                              ? "text-emerald-400"
                              : rate.isBestForConfig
                              ? "text-cyan-400"
                              : "text-white"
                          )}
                        >
                          £{rate.priceGbp}
                        </span>
                        {rate.isGlobalBest && (
                          <Crown className="h-3 w-3 text-emerald-400" />
                        )}
                        {rate.isBestForConfig && !rate.isGlobalBest && (
                          <TrendingUp className="h-3 w-3 text-cyan-400" />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/30" />
          <span>Global best price</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500/20" />
          <span>Best for term/mileage</span>
        </div>
      </div>
    </div>
  );
}
