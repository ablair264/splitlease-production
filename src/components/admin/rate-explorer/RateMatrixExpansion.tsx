"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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
  annualMileage: number | null;
}

interface RatesResponse {
  ratesByMileage: Record<number, {
    contractHire: Rate[];
    personalContractHire: Rate[];
  }>;
  availableMileages: number[];
}

// Payment profile format - show as initial+subsequent
function formatPaymentProfile(initialMonths: number, term: number): string {
  const subsequentPayments = term - 1;
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
  const [data, setData] = useState<RatesResponse | null>(null);

  // Fetch all rates
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/rates/vehicles/${vehicleId}/rates-matrix`);
        if (!response.ok) throw new Error("Failed to fetch rates");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [vehicleId]);

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

  if (!data || data.availableMileages.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-white/50 text-xs">No rates available</p>
      </div>
    );
  }

  // Standard initial payment options
  const STANDARD_INITIALS = [1, 3, 6, 9, 12];

  // Calculate total payments for a payment profile
  const getTotalPayments = (initialMonths: number, term: number): number => {
    const remaining = term - 1;
    return initialMonths + remaining;
  };

  // Estimate price based on known rate
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

    // Create matrix: provider -> termProfile -> RateCell
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
        const termGroups = new Map<number, typeof termProfiles>();
        termProfiles.forEach((tp) => {
          if (!termGroups.has(tp.term)) {
            termGroups.set(tp.term, []);
          }
          termGroups.get(tp.term)!.push(tp);
        });

        termGroups.forEach((profiles, term) => {
          let knownProfile: { initialPayment: number; price: number } | null = null;
          for (const tp of profiles) {
            const cell = matrix[provider][tp.key];
            if (cell.price !== null && !cell.isEstimate) {
              knownProfile = { initialPayment: tp.initialPayment, price: cell.price };
              break;
            }
          }

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

    // Find best price for each column (only actual prices, 5%+ savings threshold)
    const bestPrices: Record<string, number> = {};
    termProfiles.forEach((tp) => {
      const actualPrices: number[] = [];
      providers.forEach((provider) => {
        const cell = matrix[provider][tp.key];
        if (cell.price !== null && !cell.isEstimate) {
          actualPrices.push(cell.price);
        }
      });

      if (actualPrices.length >= 2) {
        actualPrices.sort((a, b) => a - b);
        const best = actualPrices[0];
        const secondBest = actualPrices[1];
        const savingsPercent = ((secondBest - best) / secondBest) * 100;
        if (savingsPercent >= 5) {
          bestPrices[tp.key] = best;
        }
      }
    });

    // Find overall best price
    let overallBestPrice: number | null = null;
    let overallBestKey: string | null = null;
    let overallBestProvider: string | null = null;
    termProfiles.forEach((tp) => {
      providers.forEach((provider) => {
        const cell = matrix[provider][tp.key];
        if (cell.price !== null && !cell.isEstimate) {
          if (overallBestPrice === null || cell.price < overallBestPrice) {
            overallBestPrice = cell.price;
            overallBestKey = tp.key;
            overallBestProvider = provider;
          }
        }
      });
    });

    return { termProfiles, providers, matrix, bestPrices, overallBestKey, overallBestProvider };
  };

  const renderMatrix = (rates: Rate[], contractTypeLabel: string) => {
    if (rates.length === 0) return null;

    const { termProfiles, providers, matrix, bestPrices, overallBestKey, overallBestProvider } = groupRates(rates);

    if (termProfiles.length === 0) {
      return null;
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-2 py-1.5 text-left text-white/50 font-semibold sticky left-0 bg-[#0f1419] z-10 w-12" rowSpan={2}>
                {contractTypeLabel}
              </th>
              {termGroups.map((group) => (
                <th
                  key={group.term}
                  colSpan={group.profiles.length}
                  className="px-1 py-1.5 text-center text-white/60 font-bold border-l border-white/10"
                >
                  {group.term}mo
                </th>
              ))}
            </tr>
            <tr className="border-b border-white/10">
              {termProfiles.map((tp, idx) => {
                const isFirstInGroup = idx === 0 || termProfiles[idx - 1].term !== tp.term;
                return (
                  <th
                    key={tp.key}
                    className={`px-1 py-1 text-center text-white/50 font-medium min-w-[52px] ${isFirstInGroup ? "border-l border-white/10" : ""}`}
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
                    className="px-2 py-1.5 sticky left-0 bg-[#0f1419] z-10"
                    style={{ color: style.text }}
                  >
                    <span className="font-bold">{PROVIDER_SHORT[provider] || provider.toUpperCase()}</span>
                  </td>
                  {termProfiles.map((tp, idx) => {
                    const cell = matrix[provider][tp.key];
                    const price = cell.price;
                    const isEstimate = cell.isEstimate;
                    const isBest = price !== null && !isEstimate && price === bestPrices[tp.key];
                    const isOverallBest = tp.key === overallBestKey && provider === overallBestProvider;
                    const isFirstInGroup = idx === 0 || termProfiles[idx - 1].term !== tp.term;

                    return (
                      <td
                        key={tp.key}
                        className={`px-1 py-1.5 text-center ${
                          isFirstInGroup ? "border-l border-white/10" : ""
                        } ${
                          isOverallBest
                            ? "text-cyan-400 font-bold"
                            : isEstimate
                              ? "text-amber-400/70 italic"
                              : isBest
                                ? "text-emerald-400 font-semibold"
                                : price
                                  ? "text-white/90 font-medium"
                                  : "text-white/20"
                        }`}
                        style={
                          isOverallBest
                            ? { background: "rgba(121, 213, 233, 0.15)", boxShadow: "inset 0 0 0 1px rgba(121, 213, 233, 0.5)" }
                            : isBest
                              ? { background: "rgba(16, 185, 129, 0.08)" }
                              : {}
                        }
                        title={isOverallBest ? "Best price" : isEstimate ? "Estimated" : undefined}
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
    );
  };

  const renderMileageSection = (mileage: number) => {
    const mileageData = data.ratesByMileage[mileage];
    if (!mileageData) return null;

    const hasContractHire = mileageData.contractHire.length > 0;
    const hasPersonalContractHire = mileageData.personalContractHire.length > 0;

    // Filter by maintenance preference to check if we have data to show
    const filteredCH = mileageData.contractHire.filter((r) =>
      showMaintenance ? r.includesMaintenance : !r.includesMaintenance
    );
    const filteredPCH = mileageData.personalContractHire.filter((r) =>
      showMaintenance ? r.includesMaintenance : !r.includesMaintenance
    );

    if (filteredCH.length === 0 && filteredPCH.length === 0) {
      return null;
    }

    return (
      <div key={mileage} className="mb-3 last:mb-0">
        {/* Mileage header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-cyan-400">
            {(mileage / 1000).toFixed(0)}k miles/year
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Contract Hire */}
        {filteredCH.length > 0 && (
          <div className="mb-1">
            {renderMatrix(mileageData.contractHire, "CH")}
          </div>
        )}

        {/* Personal Contract Hire */}
        {filteredPCH.length > 0 && (
          <div>
            {renderMatrix(mileageData.personalContractHire, "PCH")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-3 py-2 space-y-2">
      {data.availableMileages.map((mileage) => renderMileageSection(mileage))}
    </div>
  );
}
