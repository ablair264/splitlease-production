"use client";

import { cn } from "@/lib/utils";
import { ScoreBadge } from "../shared/ScoreBadge";
import { ChevronRight } from "lucide-react";

interface VehicleRate {
  id: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  providerCode: string;
  totalRental: number;
  totalRentalFormatted?: string;
  score: number;
  scoreRank?: string;
  fuelType: string | null;
  term: number;
}

interface GroupedVehicle {
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  minPrice: number;
  maxPrice: number;
  providerCount: number;
  bestScore: number;
}

interface RateExplorerVehicleListProps {
  vehicles: VehicleRate[];
  selectedId: string | null;
  onSelect: (vehicle: { capCode: string }) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Compact scrollable vehicle list for Rate Explorer.
 * Shows variant-first display with score and price range.
 */
export function RateExplorerVehicleList({
  vehicles,
  selectedId,
  onSelect,
  isLoading,
  className,
}: RateExplorerVehicleListProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-1 p-2", className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-gray-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-48 text-gray-500 text-sm",
          className
        )}
      >
        No vehicles found
      </div>
    );
  }

  // Group by CAP code to show price range
  const grouped = vehicles.reduce((acc, v) => {
    if (!acc[v.capCode]) {
      acc[v.capCode] = {
        capCode: v.capCode,
        manufacturer: v.manufacturer,
        model: v.model,
        variant: v.variant,
        fuelType: v.fuelType,
        minPrice: v.totalRental,
        maxPrice: v.totalRental,
        providerCount: 1,
        bestScore: v.score,
      };
    } else {
      acc[v.capCode].minPrice = Math.min(acc[v.capCode].minPrice, v.totalRental);
      acc[v.capCode].maxPrice = Math.max(acc[v.capCode].maxPrice, v.totalRental);
      acc[v.capCode].providerCount++;
      acc[v.capCode].bestScore = Math.max(acc[v.capCode].bestScore, v.score);
    }
    return acc;
  }, {} as Record<string, GroupedVehicle>);

  const vehicleList = Object.values(grouped);

  return (
    <div className={cn("overflow-y-auto", className)}>
      {vehicleList.map((vehicle) => {
        const isSelected = selectedId === vehicle.capCode;
        return (
          <button
            key={vehicle.capCode}
            onClick={() => onSelect({ capCode: vehicle.capCode })}
            className={cn(
              "w-full text-left px-4 py-3 transition-all border-b border-gray-800/50",
              "hover:bg-white/5",
              isSelected && "bg-cyan-500/10 border-l-2 border-l-cyan-500"
            )}
          >
            {/* Variant (primary) */}
            <div className="font-medium text-white text-sm leading-tight truncate">
              {vehicle.variant || `${vehicle.manufacturer} ${vehicle.model}`}
            </div>

            {/* Make Model (secondary) */}
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {vehicle.manufacturer} {vehicle.model}
            </div>

            {/* Score and Price Row */}
            <div className="flex items-center justify-between mt-2">
              <ScoreBadge score={vehicle.bestScore} size="sm" />
              <div className="text-right">
                <span className="text-sm font-semibold text-white">
                  £{(vehicle.minPrice / 100).toLocaleString()}
                  {vehicle.minPrice !== vehicle.maxPrice && (
                    <span className="text-gray-500">
                      -£{(vehicle.maxPrice / 100).toLocaleString()}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-600 ml-0.5">/mo</span>
              </div>
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <span>{vehicle.fuelType || "—"}</span>
              <span>
                {vehicle.providerCount} provider
                {vehicle.providerCount !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
