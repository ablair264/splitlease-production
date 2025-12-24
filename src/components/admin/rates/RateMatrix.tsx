"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

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

interface RateMatrixProps {
  rates: Rate[];
  selectedTerms: number[];
  selectedContractType: string;
  showMaintenance: boolean;
  p11d: number | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  lex: "#79d5e9",
  ogilvie: "#61bc8e",
  venus: "#f8d824",
  drivalia: "#f77d11",
};

const MILEAGE_ORDER = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];

function formatMileage(mileage: number): string {
  return `${mileage / 1000}k`;
}

function getScoreColor(score: number | null): string {
  if (!score) return "text-gray-500";
  if (score >= 80) return "text-[#61bc8e]";
  if (score >= 60) return "text-[#79d5e9]";
  if (score >= 40) return "text-[#f8d824]";
  return "text-[#f77d11]";
}

export function RateMatrix({
  rates,
  selectedTerms,
  selectedContractType,
  showMaintenance,
  p11d,
}: RateMatrixProps) {
  // Filter rates by selected terms and contract type
  const filteredRates = useMemo(() => {
    const contractTypes = showMaintenance
      ? [selectedContractType]
      : [selectedContractType + "NM"];

    return rates.filter(
      (r) =>
        selectedTerms.includes(r.term) &&
        contractTypes.includes(r.contractType)
    );
  }, [rates, selectedTerms, selectedContractType, showMaintenance]);

  // Get unique providers and mileage bands
  const providers = useMemo(() => {
    const providerSet = new Set(filteredRates.map((r) => r.providerCode));
    return Array.from(providerSet).sort();
  }, [filteredRates]);

  const mileageBands = useMemo(() => {
    const bands = Array.from(new Set(filteredRates.map((r) => r.annualMileage)));
    return bands.sort((a, b) => MILEAGE_ORDER.indexOf(a) - MILEAGE_ORDER.indexOf(b));
  }, [filteredRates]);

  // Build the matrix: term -> provider -> mileage -> rate
  const matrix = useMemo(() => {
    const m: Record<number, Record<string, Record<number, Rate>>> = {};

    for (const term of selectedTerms) {
      m[term] = {};
      for (const provider of providers) {
        m[term][provider] = {};
      }
    }

    for (const rate of filteredRates) {
      if (!m[rate.term]) continue;
      if (!m[rate.term][rate.providerCode]) {
        m[rate.term][rate.providerCode] = {};
      }
      const existing = m[rate.term][rate.providerCode][rate.annualMileage];
      if (!existing || rate.totalRental < existing.totalRental) {
        m[rate.term][rate.providerCode][rate.annualMileage] = rate;
      }
    }

    return m;
  }, [filteredRates, selectedTerms, providers]);

  // Find best rate per term/mileage combination
  const bestPerCell = useMemo(() => {
    const best: Record<string, number> = {};
    for (const term of selectedTerms) {
      for (const mileage of mileageBands) {
        let minPrice = Infinity;
        for (const provider of providers) {
          const rate = matrix[term]?.[provider]?.[mileage];
          if (rate && rate.totalRental < minPrice) {
            minPrice = rate.totalRental;
          }
        }
        best[`${term}-${mileage}`] = minPrice;
      }
    }
    return best;
  }, [matrix, selectedTerms, mileageBands, providers]);

  const getProviderDisplayName = (code: string) => {
    const names: Record<string, string> = {
      lex: "Lex Autolease",
      ogilvie: "Ogilvie Fleet",
      venus: "Venus Fleet",
      drivalia: "Drivalia",
    };
    return names[code] || code;
  };

  if (rates.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No rates available for this vehicle</p>
        </div>
      </div>
    );
  }

  if (filteredRates.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No rates for this configuration</p>
          <p className="text-gray-600 text-xs mt-1">
            Try a different term, contract type, or maintenance option
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Render a table for each selected term */}
      {selectedTerms.map((term, termIdx) => {
        const termRates = filteredRates.filter(r => r.term === term);
        const termProviders = Array.from(new Set(termRates.map(r => r.providerCode))).sort();
        const termMileages = Array.from(new Set(termRates.map(r => r.annualMileage)))
          .sort((a, b) => MILEAGE_ORDER.indexOf(a) - MILEAGE_ORDER.indexOf(b));

        if (termProviders.length === 0) return null;

        return (
          <div key={term} className={cn(termIdx > 0 && "border-t border-gray-800")}>
            {/* Term Header - Only show if multiple terms selected */}
            {selectedTerms.length > 1 && (
              <div className="px-4 py-2 bg-[#1a1f2a] border-b border-gray-800">
                <span className="text-xs font-semibold text-white uppercase tracking-wide">
                  {term} Months
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  (6+{term - 1} profile)
                </span>
              </div>
            )}

            {/* Rate Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide py-3 px-4 w-[180px]">
                    Provider
                  </th>
                  {termMileages.map((mileage) => (
                    <th
                      key={mileage}
                      className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide py-3 px-2"
                    >
                      {formatMileage(mileage)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {termProviders.map((provider, idx) => (
                  <tr
                    key={provider}
                    className={cn(
                      "transition-colors hover:bg-white/[0.02]",
                      idx < termProviders.length - 1 && "border-b border-gray-800/30"
                    )}
                  >
                    {/* Provider Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1 h-6 rounded-full shrink-0"
                          style={{ backgroundColor: PROVIDER_COLORS[provider] || "#6b7280" }}
                        />
                        <span className="text-sm font-medium text-white">
                          {getProviderDisplayName(provider)}
                        </span>
                      </div>
                    </td>

                    {/* Price Cells */}
                    {termMileages.map((mileage) => {
                      const rate = matrix[term]?.[provider]?.[mileage];
                      const isBest = rate &&
                        rate.totalRental === bestPerCell[`${term}-${mileage}`] &&
                        termProviders.length > 1;

                      return (
                        <td key={mileage} className="py-3 px-2 text-center">
                          {rate ? (
                            <div
                              className={cn(
                                "inline-flex flex-col items-center px-3 py-1.5 rounded-lg",
                                isBest && "bg-[#61bc8e]/15 ring-1 ring-[#61bc8e]/40"
                              )}
                            >
                              <span
                                className={cn(
                                  "text-sm font-semibold tabular-nums",
                                  isBest ? "text-[#61bc8e]" : "text-white"
                                )}
                              >
                                £{Math.round(rate.totalRental)}
                              </span>
                              {rate.valueScore !== null && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold tabular-nums",
                                    getScoreColor(rate.valueScore)
                                  )}
                                >
                                  {Math.round(rate.valueScore)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-gray-800 bg-[#0f1318] text-xs text-gray-500">
        <span>
          {filteredRates.length} rates from {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </span>
        {p11d && (
          <span className="ml-4">
            P11D: £{p11d.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
