"use client";

import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  capCode: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuelType: string | null;
  rateCount: number;
  avgValueScore: number | null;
  minMonthlyRental: number | null;
  hasOgilvieRates: boolean;
  hasLexRates: boolean;
  hasVenusRates: boolean;
}

interface VehicleListItemProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}

function getScoreColor(score: number | null) {
  if (!score) return "text-gray-500 bg-gray-800";
  if (score >= 80) return "text-[#61bc8e] bg-[#61bc8e]/10";
  if (score >= 60) return "text-[#79d5e9] bg-[#79d5e9]/10";
  if (score >= 40) return "text-[#f8d824] bg-[#f8d824]/10";
  return "text-[#f77d11] bg-[#f77d11]/10";
}

export function VehicleListItem({ vehicle, isSelected, onClick }: VehicleListItemProps) {
  const score = vehicle.avgValueScore;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-2.5 border-b border-gray-800/50 transition-all",
        "hover:bg-white/[0.02]",
        isSelected
          ? "bg-[#79d5e9]/5 border-l-2 border-l-[#79d5e9]"
          : "border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Make & Model - smaller */}
          <div className="text-xs font-medium text-gray-400 truncate">
            {vehicle.manufacturer} {vehicle.model}
          </div>
          {/* Variant - more prominent */}
          {vehicle.variant && (
            <div className="text-sm text-white truncate mt-0.5 font-medium">
              {vehicle.variant}
            </div>
          )}
        </div>

        {/* Score Badge */}
        {score !== null && (
          <div className={cn(
            "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold",
            getScoreColor(score)
          )}>
            {Math.round(score)}
          </div>
        )}
      </div>
    </button>
  );
}
