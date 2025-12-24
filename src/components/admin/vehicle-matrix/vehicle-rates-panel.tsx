"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Check,
  Tag,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import type { VehicleMatrixRow } from "@/app/api/admin/vehicle-matrix/route";
import type { VehicleRate } from "@/app/api/admin/vehicle-matrix/[vehicleId]/rates/route";

type VehicleDetails = {
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
};

type RatesResponse = {
  vehicle: VehicleDetails;
  rates: VehicleRate[];
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CH: "CH (WM)",
  CHNM: "CH (NM)",
  PCH: "PCH (WM)",
  PCHNM: "PCH (NM)",
  BSSNL: "Sal Sac",
  personal_contract_hire: "Personal",
  salary_sacrifice: "Sal Sac",
};

const INITIAL_MONTHS = 1;

export function VehicleRatesPanel({ vehicle }: { vehicle: VehicleMatrixRow }) {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [rates, setRates] = useState<VehicleRate[]>([]);

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/vehicle-matrix/${vehicle.id}/rates`);
      const data: RatesResponse = await res.json();
      setVehicleDetails(data.vehicle);
      setRates(data.rates || []);
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [vehicle.id]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return `£${value.toFixed(2)}`;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-white/20";
    if (score >= 75) return "text-emerald-400";
    if (score >= 55) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return "bg-white/5";
    if (score >= 75) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 55) return "bg-amber-500/10 border-amber-500/20";
    return "bg-rose-500/10 border-rose-500/20";
  };

  if (isLoading) {
    return (
      <div className="px-6 py-8 bg-black/30 border-t border-white/5 text-center">
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
          <span className="text-teal-400 font-medium text-sm">Loading rates...</span>
        </div>
      </div>
    );
  }

  // Sort rates by term, then mileage
  const sortedRates = [...rates].sort((a, b) => {
    if (a.term !== b.term) return a.term - b.term;
    return a.annualMileage - b.annualMileage;
  });

  return (
    <div className="px-6 py-4 bg-gradient-to-b from-black/30 to-black/40 border-t border-white/5">
      {/* Rates Table Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white/70">Available Rates</h3>
          {rates.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium text-white/40 bg-white/5 rounded-md">
              {rates.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchRates}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          title="Refresh rates"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {sortedRates.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/40 font-medium text-sm">No rates available</p>
            <p className="text-white/25 text-xs">Run bulk quotes to get pricing</p>
          </div>
        </div>
      ) : (
        <div className="border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Table Header */}
          <div
            className="grid grid-cols-[80px_60px_60px_80px_75px_85px_85px_75px_70px] gap-2 px-4 py-2.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider"
            style={{ background: "rgba(0, 0, 0, 0.3)" }}
          >
            <div>Provider</div>
            <div>Term</div>
            <div>Miles</div>
            <div>Contract</div>
            <div className="text-right">Initial</div>
            <div className="text-right">Monthly</div>
            <div className="text-right">OTR</div>
            <div className="text-center">Fleet</div>
            <div className="text-center">Score</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
            {sortedRates.map((rate) => {
              const monthlyRental = rate.totalRental ?? null;
              const initRental = rate.initialRental !== undefined && rate.initialRental !== null
                ? rate.initialRental
                : monthlyRental !== null
                  ? monthlyRental * INITIAL_MONTHS
                  : null;
              const otrp = rate.otrp ?? null;
              // Use stored score from API
              const score = rate.valueScore ?? null;

              return (
                <div
                  key={rate.id}
                  className="grid grid-cols-[80px_60px_60px_80px_75px_85px_85px_75px_70px] gap-2 px-4 py-2.5 text-sm items-center hover:bg-white/[0.02] transition-colors"
                >
                  {/* Provider */}
                  <div>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                        rate.source === "lex_quotes"
                          ? "bg-teal-500/15 text-teal-400 border-teal-500/25"
                          : rate.providerCode === "ogilvie"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          : rate.providerCode === "venus"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      }`}
                    >
                      {rate.providerCode?.toUpperCase() || "LEX"}
                    </span>
                  </div>

                  {/* Term */}
                  <div className="text-white/70 font-medium">{rate.term}m</div>

                  {/* Mileage */}
                  <div className="text-white/50">{(rate.annualMileage / 1000).toFixed(0)}k</div>

                  {/* Contract Type */}
                  <div className="text-white/40 text-xs font-medium truncate">
                    {CONTRACT_TYPE_LABELS[rate.contractType] || rate.contractType}
                  </div>

                  {/* Initial Rental */}
                  <div className="text-right text-white/50 text-xs font-medium">
                    {formatCurrency(initRental)}
                  </div>

                  {/* Monthly Rental */}
                  <div className="text-right font-bold text-white">
                    {formatCurrency(monthlyRental)}
                  </div>

                  {/* OTR */}
                  <div className="text-right text-white/40 text-xs font-medium">
                    {otrp !== null && otrp > 0 ? `£${(otrp / 1000).toFixed(1)}k` : "—"}
                  </div>

                  {/* Fleet Discount Indicator */}
                  <div className="text-center">
                    {rate.usedFleetDiscount ? (
                      <div className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15">
                        <Tag className="w-2.5 h-2.5 text-purple-400" />
                      </div>
                    ) : (
                      <span className="text-white/15">—</span>
                    )}
                  </div>

                  {/* Value Score */}
                  <div className="text-center">
                    {score !== null ? (
                      <span className={`inline-flex items-center justify-center w-8 h-5 rounded-md text-[10px] font-bold border ${getScoreBg(score)} ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    ) : (
                      <span className="text-white/15">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
