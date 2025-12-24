"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown } from "lucide-react";

interface RateMatrixExpansionProps {
  vehicleId: string;
  showMaintenance: boolean;
}

interface Rate {
  providerCode: string;
  providerName: string;
  term: number;
  initialPaymentMonths: number;
  monthlyRental: number;
  contractType: string;
  includesMaintenance: boolean;
}

interface RatesMatrix {
  contractHire: Rate[];
  personalContractHire: Rate[];
  availableMileages: number[];
  selectedMileage: number;
}

// Payment profile format - show as initial+subsequent
// In UK leasing: "3+23" means 3 months upfront + 23 subsequent payments = 24 month term
function formatPaymentProfile(initialMonths: number, term: number): string {
  const subsequentPayments = term - 1; // Subsequent payments are always term minus 1
  return `${initialMonths}+${subsequentPayments}`;
}

// Provider colors
const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  lex: { bg: "rgba(121, 213, 233, 0.15)", text: "#79d5e9" },
  ogilvie: { bg: "rgba(97, 188, 142, 0.15)", text: "#61bc8e" },
  venus: { bg: "rgba(248, 216, 36, 0.15)", text: "#f8d824" },
  drivalia: { bg: "rgba(247, 125, 17, 0.15)", text: "#f77d11" },
  ald: { bg: "rgba(255, 107, 107, 0.15)", text: "#ff6b6b" },
};

// Provider display names (short)
const PROVIDER_SHORT: Record<string, string> = {
  lex: "LEX",
  ogilvie: "OGI",
  venus: "VEN",
  drivalia: "DRI",
  ald: "ALD",
};

interface RateCell {
  price: number | null;
  isEstimate: boolean;
}

export function RateMatrixExpansion({ vehicleId, showMaintenance }: RateMatrixExpansionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratesMatrix, setRatesMatrix] = useState<RatesMatrix | null>(null);
  const [selectedMileage, setSelectedMileage] = useState<number | null>(null);

  // Fetch rates matrix
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const mileageParam = selectedMileage ? `?mileage=${selectedMileage}` : "";
        const response = await fetch(`/api/admin/rates/vehicles/${vehicleId}/rates-matrix${mileageParam}`);
        if (!response.ok) throw new Error("Failed to fetch rates");
        const data = await response.json();
        setRatesMatrix(data);
        // Set initial mileage from response if not already set
        if (selectedMileage === null && data.selectedMileage) {
          setSelectedMileage(data.selectedMileage);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [vehicleId, selectedMileage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-red-400 text-xs">{error}</p>
      </div>
    );
  }

  if (!ratesMatrix) {
    return (
      <div className="py-4 text-center">
        <p className="text-white/50 text-xs">No rates available</p>
      </div>
    );
  }

  // Calculate total payments for a payment profile
  // e.g., 6+23 = 6 initial + 23 remaining = 29 total payments
  const getTotalPayments = (initialMonths: number, term: number): number => {
    const remaining = term - 1;
    return initialMonths + remaining;
  };

  // Estimate price based on known rate
  // Formula: estimatedPrice = knownPrice × knownTotalPayments / targetTotalPayments
  const estimatePrice = (
    knownPrice: number,
    knownInitial: number,
    targetInitial: number,
    term: number
  ): number => {
    const knownTotal = getTotalPayments(knownInitial, term);
    const targetTotal = getTotalPayments(targetInitial, term);
    return Math.round(knownPrice * knownTotal / targetTotal);
  };

  // Standard initial payment options
  const STANDARD_INITIALS = [1, 3, 6, 9, 12];

  // Group rates and build matrix
  const groupRates = (rates: Rate[]) => {
    // Filter by maintenance preference
    const filteredRates = rates.filter((r) =>
      showMaintenance ? r.includesMaintenance : !r.includesMaintenance
    );

    // Get all unique terms and providers from the data
    const termSet = new Set<number>();
    const providerSet = new Set<string>();

    filteredRates.forEach((r) => {
      termSet.add(r.term);
      providerSet.add(r.providerCode);
    });

    // Create ALL standard payment profiles for each term
    const terms = Array.from(termSet).sort((a, b) => a - b);
    const termProfiles: { term: number; initialPayment: number; key: string }[] = [];

    terms.forEach((term) => {
      STANDARD_INITIALS.forEach((initial) => {
        termProfiles.push({
          term,
          initialPayment: initial,
          key: `${term}-${initial}`,
        });
      });
    });

    const providers = Array.from(providerSet).sort();

    // Create matrix: provider -> termProfile -> RateCell (with estimate flag)
    const matrix: Record<string, Record<string, RateCell>> = {};
    providers.forEach((provider) => {
      matrix[provider] = {};
      termProfiles.forEach((tp) => {
        matrix[provider][tp.key] = { price: null, isEstimate: false };
      });
    });

    // Fill in actual rates
    filteredRates.forEach((rate) => {
      const key = `${rate.term}-${rate.initialPaymentMonths}`;
      if (matrix[rate.providerCode]) {
        matrix[rate.providerCode][key] = { price: rate.monthlyRental, isEstimate: false };
      }
    });

    // Calculate estimates for missing cells (only for non-maintenance rates)
    if (!showMaintenance) {
      providers.forEach((provider) => {
        // Group profiles by term
        const termGroups = new Map<number, typeof termProfiles>();
        termProfiles.forEach((tp) => {
          if (!termGroups.has(tp.term)) {
            termGroups.set(tp.term, []);
          }
          termGroups.get(tp.term)!.push(tp);
        });

        // For each term, try to estimate missing prices
        termGroups.forEach((profiles, term) => {
          // Find a known price for this term from this provider
          let knownProfile: { initialPayment: number; price: number } | null = null;
          for (const tp of profiles) {
            const cell = matrix[provider][tp.key];
            if (cell.price !== null && !cell.isEstimate) {
              knownProfile = { initialPayment: tp.initialPayment, price: cell.price };
              break;
            }
          }

          // If we have a known price, estimate missing ones
          if (knownProfile) {
            profiles.forEach((tp) => {
              const cell = matrix[provider][tp.key];
              if (cell.price === null) {
                const estimated = estimatePrice(
                  knownProfile!.price,
                  knownProfile!.initialPayment,
                  tp.initialPayment,
                  term
                );
                matrix[provider][tp.key] = { price: estimated, isEstimate: true };
              }
            });
          }
        });
      });
    }

    // Find best price for each column (only actual prices, not estimates)
    // Only mark as "best" if it's meaningfully cheaper than competition (5%+ savings)
    const bestPrices: Record<string, number> = {};
    termProfiles.forEach((tp) => {
      const actualPrices: number[] = [];
      providers.forEach((provider) => {
        const cell = matrix[provider][tp.key];
        if (cell.price !== null && !cell.isEstimate) {
          actualPrices.push(cell.price);
        }
      });

      // Need at least 2 providers with actual prices
      if (actualPrices.length >= 2) {
        actualPrices.sort((a, b) => a - b);
        const best = actualPrices[0];
        const secondBest = actualPrices[1];
        // Only highlight if at least 5% cheaper than second best
        const savingsPercent = ((secondBest - best) / secondBest) * 100;
        if (savingsPercent >= 5) {
          bestPrices[tp.key] = best;
        }
      }
    });

    return { termProfiles, providers, matrix, bestPrices };
  };

  const renderMatrix = (rates: Rate[], title: string, isFirst: boolean = false) => {
    if (rates.length === 0) return null;

    const { termProfiles, providers, matrix, bestPrices } = groupRates(rates);

    if (termProfiles.length === 0) {
      return (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-white/70 mb-2">{title}</h4>
          <p className="text-white/40 text-[10px]">No rates available for current filter</p>
        </div>
      );
    }

    // Group columns by term for header
    const termGroups: { term: number; profiles: typeof termProfiles }[] = [];
    let currentTerm: number | null = null;

    termProfiles.forEach((tp) => {
      if (tp.term !== currentTerm) {
        termGroups.push({ term: tp.term, profiles: [] });
        currentTerm = tp.term;
      }
      termGroups[termGroups.length - 1].profiles.push(tp);
    });

    return (
      <div className="mb-2">
        {/* Section header with title and mileage selector (only on first matrix) */}
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">{title}</h4>
          {isFirst && ratesMatrix && ratesMatrix.availableMileages.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40">Annual miles:</span>
              <div className="relative">
                <select
                  value={selectedMileage ?? ratesMatrix.selectedMileage}
                  onChange={(e) => setSelectedMileage(parseInt(e.target.value, 10))}
                  className="appearance-none bg-white/5 border border-white/10 rounded px-1.5 py-0.5 pr-4 text-[10px] text-cyan-400 font-medium cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 focus:outline-none focus:border-cyan-500/50"
                >
                  {ratesMatrix.availableMileages.map((m) => (
                    <option key={m} value={m} className="bg-[#1a1f25] text-white">
                      {(m / 1000).toFixed(0)}k
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0.5 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400/60 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Term header row */}
              <tr className="border-b border-white/10">
                <th className="px-1 py-0.5 text-left text-white/40 font-medium sticky left-0 bg-[#0f1419] z-10 w-12 text-[10px]" rowSpan={2}>
                  {/* Provider label */}
                </th>
                {termGroups.map((group) => (
                  <th
                    key={group.term}
                    colSpan={group.profiles.length}
                    className="px-0.5 py-0.5 text-center text-white/50 font-semibold border-l border-white/10 text-xs"
                  >
                    {group.term}mo
                  </th>
                ))}
              </tr>
              {/* Payment profile header row */}
              <tr className="border-b border-white/10">
                {termProfiles.map((tp, idx) => {
                  const isFirstInGroup = idx === 0 || termProfiles[idx - 1].term !== tp.term;
                  return (
                    <th
                      key={tp.key}
                      className={`px-1 py-0.5 text-center text-white/60 font-medium min-w-[52px] text-xs ${isFirstInGroup ? "border-l border-white/10" : ""}`}
                    >
                      {formatPaymentProfile(tp.initialPayment, tp.term)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => {
                const style = PROVIDER_COLORS[provider] || { bg: "rgba(255, 255, 255, 0.1)", text: "#ffffff" };
                return (
                  <tr key={provider} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td
                      className="px-1.5 py-1 sticky left-0 bg-[#0f1419] z-10 text-[11px]"
                      style={{ color: style.text }}
                    >
                      <span className="font-semibold">{PROVIDER_SHORT[provider] || provider.toUpperCase()}</span>
                    </td>
                    {termProfiles.map((tp, idx) => {
                      const cell = matrix[provider][tp.key];
                      const price = cell.price;
                      const isEstimate = cell.isEstimate;
                      const isBest = price !== null && !isEstimate && price === bestPrices[tp.key];
                      const isFirstInGroup = idx === 0 || termProfiles[idx - 1].term !== tp.term;

                      return (
                        <td
                          key={tp.key}
                          className={`px-1 py-1 text-center text-xs ${
                            isFirstInGroup ? "border-l border-white/10" : ""
                          } ${
                            isEstimate
                              ? "text-amber-400/70 italic font-normal"
                              : isBest
                                ? "text-emerald-400 font-semibold"
                                : price
                                  ? "text-white/80 font-semibold"
                                  : "text-white/20"
                          }`}
                          style={isBest ? { background: "rgba(16, 185, 129, 0.08)" } : {}}
                          title={isEstimate ? "Estimated price" : undefined}
                        >
                          {price !== null ? `£${price}` : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="px-2 pt-1 pb-1.5">
      {/* Contract Hire Matrix */}
      {renderMatrix(ratesMatrix.contractHire, "Contract Hire", true)}

      {/* Personal Contract Hire Matrix */}
      {renderMatrix(ratesMatrix.personalContractHire, "Personal Contract Hire")}
    </div>
  );
}
