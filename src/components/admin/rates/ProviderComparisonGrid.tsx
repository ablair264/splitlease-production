// src/components/admin/rates/ProviderComparisonGrid.tsx
"use client";

import { cn } from "@/lib/utils";
import { ScoreBadge } from "../shared/ScoreBadge";
import { Check } from "lucide-react";

interface TermPrice {
  price: number;
  priceFormatted: string;
  score: number;
  paymentPlan: string;
  isBest: boolean;
}

interface ProviderRow {
  provider: string;
  terms: Record<number, TermPrice>;
}

interface ProviderComparisonGridProps {
  terms: number[];
  comparison: ProviderRow[];
  mileage: number;
  onCellClick?: (provider: string, term: number) => void;
  className?: string;
}

/**
 * Provider × Term comparison grid with heatmap coloring.
 * Best price per term highlighted with checkmark.
 */
export function ProviderComparisonGrid({
  terms,
  comparison,
  mileage,
  onCellClick,
  className,
}: ProviderComparisonGridProps) {
  // Find price range for heatmap coloring
  const allPrices = comparison.flatMap((c) =>
    Object.values(c.terms).map((t) => t.price)
  );
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  const getPriceColor = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    if (ratio < 0.33) return "bg-emerald-500/20 text-emerald-300";
    if (ratio < 0.66) return "bg-cyan-500/20 text-cyan-300";
    return "bg-gray-500/20 text-gray-300";
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700">
              Provider
            </th>
            {terms.map((term) => (
              <th
                key={term}
                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700"
              >
                {term}mo / {(mileage / 1000).toFixed(0)}k
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.map((row) => (
            <tr
              key={row.provider}
              className="border-b border-gray-800 hover:bg-white/5 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-medium text-white">
                {row.provider}
              </td>
              {terms.map((term) => {
                const cell = row.terms[term];
                if (!cell) {
                  return (
                    <td
                      key={term}
                      className="px-4 py-3 text-center text-gray-600"
                    >
                      —
                    </td>
                  );
                }

                return (
                  <td
                    key={term}
                    className={cn(
                      "px-4 py-3 text-center cursor-pointer transition-all",
                      getPriceColor(cell.price),
                      cell.isBest && "ring-2 ring-emerald-500/50"
                    )}
                    onClick={() => onCellClick?.(row.provider, term)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold flex items-center gap-1">
                        {cell.priceFormatted}
                        {cell.isBest && (
                          <Check className="h-3 w-3 text-emerald-400" />
                        )}
                      </span>
                      <ScoreBadge score={cell.score} size="sm" showIcon={false} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
