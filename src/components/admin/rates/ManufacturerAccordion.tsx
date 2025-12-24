"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Car, Zap, Fuel, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";
import { VehicleDisplay } from "@/components/admin/shared/VehicleDisplay";

interface Manufacturer {
  manufacturer: string;
  vehicleCount: number;
  bestPriceGbp: number;
  avgPriceGbp: number;
  bestScore: number;
  avgScore: number;
  providers: string[];
}

interface Vehicle {
  capCode: string;
  model: string;
  variant: string | null;
  displayName: string;
  fuelType: string | null;
  bestPriceGbp: number;
  score: number;
  scoreLabel: string;
  providers: string[];
  imageUrl: string | null;
}

interface ManufacturerAccordionProps {
  manufacturers: Manufacturer[];
  isLoading: boolean;
  contractType: string;
  term: number;
  mileage: number;
  onVehicleSelect: (vehicle: Vehicle, manufacturer: string) => void;
  selectedCapCode: string | null;
}

export function ManufacturerAccordion({
  manufacturers,
  isLoading,
  contractType,
  term,
  mileage,
  onVehicleSelect,
  selectedCapCode,
}: ManufacturerAccordionProps) {
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);

  // Fetch vehicles when a manufacturer is expanded
  const vehiclesQuery = useQuery({
    queryKey: ["manufacturer-vehicles", expandedManufacturer, contractType, term, mileage],
    queryFn: async () => {
      if (!expandedManufacturer) return null;
      const params = new URLSearchParams({
        contractType,
        term: term.toString(),
        mileage: mileage.toString(),
      });
      const res = await fetch(
        `/api/admin/rates/manufacturers/${encodeURIComponent(expandedManufacturer)}/vehicles?${params}`
      );
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    enabled: !!expandedManufacturer,
  });

  const toggleManufacturer = (manufacturer: string) => {
    setExpandedManufacturer(
      expandedManufacturer === manufacturer ? null : manufacturer
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!manufacturers.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Car className="h-12 w-12 mb-3 opacity-50" />
        <p>No manufacturers found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {manufacturers.map((mfr) => {
        const isExpanded = expandedManufacturer === mfr.manufacturer;
        const vehicles = isExpanded ? (vehiclesQuery.data?.vehicles || []) : [];

        return (
          <div key={mfr.manufacturer}>
            {/* Manufacturer Row */}
            <button
              onClick={() => toggleManufacturer(mfr.manufacturer)}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-4 transition-colors",
                "hover:bg-gray-800/50",
                isExpanded && "bg-gray-800/30"
              )}
            >
              {/* Expand Icon */}
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-gray-500 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />

              {/* Manufacturer Name */}
              <div className="flex-1 text-left">
                <div className="font-medium text-white">{mfr.manufacturer}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    {mfr.vehicleCount} vehicles
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {mfr.providers.length} providers
                  </span>
                </div>
              </div>

              {/* Best Price */}
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  £{mfr.bestPriceGbp.toLocaleString()}/mo
                </div>
                <div className="text-xs text-gray-500">best price</div>
              </div>

              {/* Best Score */}
              <ScoreBadge score={mfr.bestScore} size="sm" />
            </button>

            {/* Expanded Vehicle List */}
            {isExpanded && (
              <div className="bg-[#0f1419] border-l-2 border-cyan-500/30">
                {vehiclesQuery.isLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-14 bg-gray-800/30 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No vehicles available for current filters
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {vehicles.map((vehicle: Vehicle) => (
                      <button
                        key={vehicle.capCode}
                        onClick={() => onVehicleSelect(vehicle, mfr.manufacturer)}
                        className={cn(
                          "w-full px-4 py-3 pl-10 flex items-center gap-4 transition-colors",
                          "hover:bg-gray-800/30",
                          selectedCapCode === vehicle.capCode &&
                            "bg-cyan-500/10 border-l-2 border-cyan-500"
                        )}
                      >
                        {/* Vehicle Image */}
                        {vehicle.imageUrl ? (
                          <img
                            src={vehicle.imageUrl}
                            alt=""
                            className="w-12 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-8 bg-gray-800 rounded flex items-center justify-center">
                            <Car className="h-4 w-4 text-gray-600" />
                          </div>
                        )}

                        {/* Vehicle Info - VARIANT PROMINENT */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-white truncate">
                            {vehicle.displayName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {vehicle.fuelType && (
                              <span className="flex items-center gap-1">
                                {vehicle.fuelType === "Electric" ? (
                                  <Zap className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Fuel className="h-3 w-3" />
                                )}
                                {vehicle.fuelType}
                              </span>
                            )}
                            <span className="opacity-60">{vehicle.capCode}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">
                            £{vehicle.bestPriceGbp.toLocaleString()}/mo
                          </div>
                          <div className="text-xs text-gray-500">
                            {vehicle.providers.length} provider{vehicle.providers.length > 1 ? "s" : ""}
                          </div>
                        </div>

                        {/* Score */}
                        <ScoreBadge score={vehicle.score} size="sm" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
