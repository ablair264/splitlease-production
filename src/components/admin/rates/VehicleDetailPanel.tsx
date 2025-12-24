"use client";

import { useState, useEffect } from "react";
import { Zap, Plug, Fuel, Battery, Tag, Copy, Check, Flame } from "lucide-react";
import { RateMatrix } from "./RateMatrix";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  capCode: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  co2: number | null;
  p11d: number | null;
  insuranceGroup: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyStyle: string | null;
  mpg: string | null;
  lexMakeCode: string | null;
  lexModelCode: string | null;
  lexVariantCode: string | null;
}

interface Rate {
  id: string;
  source: "provider_rates" | "lex_quotes";
  providerCode: string;
  providerName: string;
  contractType: string;
  term: number;
  annualMileage: number;
  paymentPlan: string;
  totalRental: number;
  valueScore: number | null;
  p11d: number | null;
}

interface VehicleDetailPanelProps {
  vehicleId: string;
}

function getFuelIcon(fuelType: string | null) {
  if (!fuelType) return null;
  const type = fuelType.toLowerCase();
  if (type.includes("electric") || type === "bev") {
    return <Plug className="w-4 h-4 text-[#4daeac]" />;
  }
  if (type.includes("hybrid") || type.includes("phev") || type.includes("mhev")) {
    return <Battery className="w-4 h-4 text-[#61bc8e]" />;
  }
  if (type.includes("petrol")) {
    return <Zap className="w-4 h-4 text-[#f8d824]" />;
  }
  if (type.includes("diesel")) {
    return <Fuel className="w-4 h-4 text-[#9ca3af]" />;
  }
  return null;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-[#61bc8e] bg-[#61bc8e]/10 border-[#61bc8e]/30";
  if (score >= 60) return "text-[#79d5e9] bg-[#79d5e9]/10 border-[#79d5e9]/30";
  if (score >= 40) return "text-[#f8d824] bg-[#f8d824]/10 border-[#f8d824]/30";
  return "text-[#f77d11] bg-[#f77d11]/10 border-[#f77d11]/30";
}

export function VehicleDetailPanel({ vehicleId }: VehicleDetailPanelProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Filter state - multi-select for terms
  const [selectedTerms, setSelectedTerms] = useState<number[]>([36]);
  const [selectedContractType, setSelectedContractType] = useState<string>("CH");
  const [showMaintenance, setShowMaintenance] = useState(true);

  useEffect(() => {
    async function fetchVehicleRates() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/vehicle-matrix/${vehicleId}/rates`);
        const data = await response.json();
        if (data.vehicle) {
          setVehicle(data.vehicle);
          const fetchedRates = data.rates || [];
          setRates(fetchedRates);

          // Auto-select available terms
          const termSet = new Set(fetchedRates.map((r: Rate) => r.term));
          const availableTerms = Array.from(termSet).sort((a, b) => (a as number) - (b as number)) as number[];
          if (availableTerms.length > 0 && !availableTerms.includes(36)) {
            setSelectedTerms([availableTerms[0]]);
          }

          // Auto-detect available contract types and maintenance options
          const contractTypes = Array.from(new Set(fetchedRates.map((r: Rate) => r.contractType))) as string[];

          // Check what's available: CH, CHNM, PCH, PCHNM
          const hasCH = contractTypes.includes("CH");
          const hasCHNM = contractTypes.includes("CHNM");
          const hasPCH = contractTypes.includes("PCH");
          const hasPCHNM = contractTypes.includes("PCHNM");

          // Default to whatever is available, preferring CH with maintenance
          if (hasCH) {
            setSelectedContractType("CH");
            setShowMaintenance(true);
          } else if (hasCHNM) {
            setSelectedContractType("CH");
            setShowMaintenance(false);
          } else if (hasPCH) {
            setSelectedContractType("PCH");
            setShowMaintenance(true);
          } else if (hasPCHNM) {
            setSelectedContractType("PCH");
            setShowMaintenance(false);
          }
        }
      } catch (error) {
        console.error("Error fetching vehicle rates:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVehicleRates();
  }, [vehicleId]);

  const handleCopyCapCode = () => {
    if (vehicle?.capCode) {
      navigator.clipboard.writeText(vehicle.capCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleTerm = (term: number) => {
    if (selectedTerms.includes(term)) {
      if (selectedTerms.length > 1) {
        setSelectedTerms(selectedTerms.filter(t => t !== term));
      }
    } else {
      setSelectedTerms([...selectedTerms, term].sort((a, b) => a - b));
    }
  };

  // Get unique terms from rates
  const availableTerms = Array.from(new Set(rates.map((r) => r.term))).sort((a, b) => a - b);
  const allTerms = [24, 36, 48, 60];

  // Calculate best score from all selected terms
  const filteredRatesForScore = rates.filter(
    (r) => selectedTerms.includes(r.term) &&
    (r.contractType === selectedContractType || r.contractType === selectedContractType + "NM")
  );
  const bestScore = Math.max(...filteredRatesForScore.map((r) => r.valueScore || 0), 0);
  const isHotDeal = bestScore >= 90;

  if (isLoading) {
    return (
      <div className="h-full p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-800 rounded w-1/3 mb-6" />
          <div className="h-12 bg-gray-800 rounded mb-4" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Vehicle not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Vehicle Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Vehicle Name */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white truncate">
                {vehicle.manufacturer} {vehicle.model}
              </h2>
              {getFuelIcon(vehicle.fuelType)}
            </div>
            <p className="text-sm text-gray-400 mt-0.5 truncate">{vehicle.variant}</p>

            {/* Specs Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
              {/* CAP Code */}
              {vehicle.capCode && (
                <button
                  onClick={handleCopyCapCode}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">{vehicle.capCode}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-[#61bc8e]" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-50" />
                  )}
                </button>
              )}

              {/* P11D - NOT divided by 100 */}
              {vehicle.p11d && (
                <div className="text-gray-400">
                  <span className="text-white font-medium">
                    £{vehicle.p11d.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs">P11D</span>
                </div>
              )}

              {/* CO2 */}
              {vehicle.co2 !== null && (
                <span className="text-gray-400">
                  <span className="text-white">{vehicle.co2}</span>
                  <span className="text-xs ml-0.5">g/km</span>
                </span>
              )}

              {/* Transmission */}
              {vehicle.transmission && (
                <span className="text-gray-400">{vehicle.transmission}</span>
              )}
            </div>
          </div>

          {/* Score Badge with Hot Deal */}
          {bestScore > 0 && (
            <div className="flex flex-col items-end gap-1">
              {isHotDeal ? (
                <div className="relative">
                  {/* Animated flame glow */}
                  <div className="absolute -inset-1 bg-gradient-to-t from-[#f77d11] via-[#ff9500] to-[#ffcc00] rounded-xl opacity-75 blur-sm animate-pulse" />
                  <div className={cn(
                    "relative w-16 h-16 rounded-xl flex flex-col items-center justify-center text-xl font-bold",
                    "bg-gradient-to-t from-[#f77d11] to-[#ff9500] text-white shadow-lg"
                  )}>
                    <Flame className="w-4 h-4 mb-0.5 animate-bounce" />
                    <span>{Math.round(bestScore)}</span>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold border",
                  getScoreColor(bestScore)
                )}>
                  {Math.round(bestScore)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="px-5 py-3 border-b border-gray-800 bg-[#0f1318] flex items-center justify-between gap-6">
        {/* Left: Term + Maintenance */}
        <div className="flex items-center gap-6">
          {/* Term Multi-select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Term:</span>
            <div className="flex rounded-lg bg-[#1a1f2a] p-0.5 gap-0.5">
              {allTerms.map((term) => {
                const isAvailable = availableTerms.includes(term);
                const isSelected = selectedTerms.includes(term);
                return (
                  <button
                    key={term}
                    onClick={() => isAvailable && toggleTerm(term)}
                    disabled={!isAvailable}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      !isAvailable && "opacity-30 cursor-not-allowed",
                      isSelected && isAvailable
                        ? "bg-[#79d5e9] text-[#0f1419]"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    {term}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Maintenance Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Maint:</span>
            <div className="flex rounded-lg bg-[#1a1f2a] p-0.5">
              <button
                onClick={() => setShowMaintenance(true)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  showMaintenance
                    ? "bg-[#79d5e9] text-[#0f1419]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Incl
              </button>
              <button
                onClick={() => setShowMaintenance(false)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  !showMaintenance
                    ? "bg-[#79d5e9] text-[#0f1419]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Excl
              </button>
            </div>
          </div>
        </div>

        {/* Right: Contract Type */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type:</span>
          <div className="flex rounded-lg bg-[#1a1f2a] p-0.5">
            <button
              onClick={() => setSelectedContractType("CH")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                selectedContractType === "CH"
                  ? "bg-[#79d5e9] text-[#0f1419]"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Business
            </button>
            <button
              onClick={() => setSelectedContractType("PCH")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                selectedContractType === "PCH"
                  ? "bg-[#79d5e9] text-[#0f1419]"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Personal
            </button>
          </div>
        </div>
      </div>

      {/* Rate Matrix - Edge to Edge */}
      <div className="flex-1 overflow-auto">
        <RateMatrix
          rates={rates}
          selectedTerms={selectedTerms}
          selectedContractType={selectedContractType}
          showMaintenance={showMaintenance}
          p11d={vehicle.p11d}
        />
      </div>
    </div>
  );
}
