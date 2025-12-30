"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { VehicleTableRow } from "./types";
import {
  SelectionHeader,
  SelectionCell,
  StarCell,
  LogoCell,
  StrengthIndicator,
  IntegrityBadge,
  BestFunderBadge,
  FuelTypeBadge,
  OtrOpportunityBadge,
  PricePositionBadge,
} from "./cells";

const columnHelper = createColumnHelper<VehicleTableRow>();

interface ColumnOptions {
  onToggleSpecialOffer?: (vehicleId: string, isSpecialOffer: boolean) => void;
  onViewCompetitors?: (capCode: string) => void;
}

export function createRateExplorerColumns(options: ColumnOptions = {}): ColumnDef<VehicleTableRow, unknown>[] {
  const { onToggleSpecialOffer, onViewCompetitors } = options;

  return [
    // Selection checkbox
    columnHelper.display({
      id: "select",
      header: ({ table }) => <SelectionHeader table={table} />,
      cell: ({ row }) => <SelectionCell row={row} />,
      size: 40,
      enableSorting: false,
      enableResizing: false,
    }),

    // Special offer star
    columnHelper.accessor("isSpecialOffer", {
      id: "star",
      header: () => (
        <span className="sr-only">Special Offer</span>
      ),
      cell: ({ row }) => (
        <StarCell
          isSpecialOffer={row.original.isSpecialOffer}
          onClick={() => onToggleSpecialOffer?.(row.original.id, !row.original.isSpecialOffer)}
        />
      ),
      size: 40,
      enableSorting: true,
    }),

    // Manufacturer logo
    columnHelper.display({
      id: "logo",
      header: () => null,
      cell: ({ row }) => (
        <LogoCell
          logoUrl={row.original.logoUrl}
          manufacturer={row.original.manufacturer}
        />
      ),
      size: 50,
      enableSorting: false,
    }),

    // Vehicle ID
    columnHelper.accessor("id", {
      id: "vehicleId",
      header: "ID",
      cell: ({ getValue }) => {
        const id = getValue();
        const shortId = id.slice(0, 8);
        return (
          <span
            className="text-[10px] text-white/40 font-mono cursor-help"
            title={id}
          >
            {shortId}
          </span>
        );
      },
      size: 80,
      enableSorting: false,
    }),

    // Manufacturer
    columnHelper.accessor("manufacturer", {
      header: "Make",
      cell: ({ getValue }) => (
        <span className="font-medium text-white text-xs">
          {getValue()}
        </span>
      ),
      size: 100,
      enableSorting: true,
    }),

    // Model
    columnHelper.accessor("model", {
      header: "Model",
      cell: ({ getValue }) => (
        <span className="text-white/80 text-xs">
          {getValue()}
        </span>
      ),
      size: 120,
      enableSorting: true,
    }),

    // Variant
    columnHelper.accessor("variant", {
      header: "Variant",
      cell: ({ getValue }) => {
        const variant = getValue();
        return (
          <span
            className="text-white/60 text-xs leading-tight line-clamp-2 cursor-help"
            title={variant || "-"}
          >
            {variant || "-"}
          </span>
        );
      },
      size: 200,
      enableSorting: false,
    }),

    // Fuel Type
    columnHelper.accessor("fuelType", {
      header: "Fuel",
      cell: ({ getValue }) => <FuelTypeBadge fuelType={getValue()} />,
      size: 90,
      enableSorting: true,
    }),

    // P11D
    columnHelper.accessor("p11dGbp", {
      header: "P11D",
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className="text-white/60 text-xs">
            {value > 0
              ? value.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
              : "-"
            }
          </span>
        );
      },
      size: 100,
      enableSorting: true,
    }),

    // Best Funder
    columnHelper.accessor("bestFunder", {
      id: "bestFunder",
      header: () => (
        <span className="text-cyan-400">Best Price</span>
      ),
      cell: ({ getValue }) => {
        const funder = getValue();
        return (
          <BestFunderBadge
            code={funder.code}
            name={funder.name}
            priceGbp={funder.priceGbp}
          />
        );
      },
      size: 130,
      enableSorting: true,
      sortingFn: (rowA, rowB) =>
        rowA.original.bestFunder.priceGbp - rowB.original.bestFunder.priceGbp,
    }),

    // OTR Opportunity - when terms holder OTR could yield better rate
    columnHelper.accessor("termsHolderOtr", {
      id: "otrOpportunity",
      header: () => (
        <span className="text-emerald-400" title="Potential savings using terms holder OTR">
          OTR
        </span>
      ),
      cell: ({ getValue }) => (
        <OtrOpportunityBadge data={getValue()} />
      ),
      size: 90,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aVal = rowA.original.termsHolderOtr?.savingsGbp || 0;
        const bVal = rowB.original.termsHolderOtr?.savingsGbp || 0;
        return aVal - bVal;
      },
    }),

    // Market Position - comparison with competitor pricing
    columnHelper.accessor("marketPosition", {
      id: "marketPosition",
      header: () => (
        <span className="text-purple-400" title="Price position vs competitors">
          Market
        </span>
      ),
      cell: ({ getValue, row }) => {
        const data = getValue();
        if (!data) {
          return (
            <span className="text-[10px] text-white/30">-</span>
          );
        }
        return (
          <PricePositionBadge
            position={data.position}
            percentile={data.percentile}
            priceDeltaPercent={data.priceDeltaPercent}
            competitorCount={data.competitorCount}
            showDelta={true}
            onClick={onViewCompetitors ? () => onViewCompetitors(row.original.capCode) : undefined}
          />
        );
      },
      size: 110,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aVal = rowA.original.marketPosition?.percentile ?? 50;
        const bVal = rowB.original.marketPosition?.percentile ?? 50;
        return aVal - bVal; // Lower percentile = better position
      },
    }),

    // Strength (provider count)
    columnHelper.accessor("providerCount", {
      id: "strength",
      header: "Strength",
      cell: ({ getValue }) => (
        <StrengthIndicator providerCount={getValue()} />
      ),
      size: 100,
      enableSorting: true,
    }),

    // Integrity (rate age)
    columnHelper.accessor("integrityDays", {
      id: "integrity",
      header: "Integrity",
      cell: ({ getValue }) => (
        <IntegrityBadge days={getValue()} />
      ),
      size: 100,
      enableSorting: true,
    }),

    // Score with tooltip showing breakdown
    columnHelper.accessor("bestScore", {
      id: "score",
      header: "Score",
      cell: ({ getValue, row }) => {
        const score = getValue();
        const breakdown = row.original.scoreBreakdown;
        const monthlyRental = row.original.bestFunder.priceGbp;

        // Get value label - aligned with scoring.ts thresholds
        const getValueLabel = (s: number) => {
          if (s >= 90) return "Exceptional";
          if (s >= 75) return "Great";
          if (s >= 60) return "Good";
          if (s >= 45) return "Fair";
          if (s >= 30) return "Average";
          return "Poor";
        };

        // Get score style - aligned with new scoring thresholds
        const getScoreStyle = (s: number) => {
          if (s >= 90) return { bg: "rgba(52, 211, 153, 0.2)", border: "rgba(52, 211, 153, 0.4)", text: "#34d399" };   // emerald
          if (s >= 75) return { bg: "rgba(74, 222, 128, 0.2)", border: "rgba(74, 222, 128, 0.4)", text: "#4ade80" };   // green
          if (s >= 60) return { bg: "rgba(163, 230, 53, 0.2)", border: "rgba(163, 230, 53, 0.4)", text: "#a3e635" };   // lime
          if (s >= 45) return { bg: "rgba(250, 204, 21, 0.2)", border: "rgba(250, 204, 21, 0.4)", text: "#facc15" };   // yellow
          if (s >= 30) return { bg: "rgba(251, 146, 60, 0.2)", border: "rgba(251, 146, 60, 0.4)", text: "#fb923c" };   // orange
          return { bg: "rgba(100, 116, 139, 0.2)", border: "rgba(100, 116, 139, 0.4)", text: "#64748b" };              // gray
        };

        // Format bonus/modifier with sign
        const formatModifier = (val: number) => {
          if (val > 0) return `+${val}`;
          if (val < 0) return `${val}`;
          return "0";
        };

        // Get color for bonus/modifier
        const getModifierColor = (val: number) => {
          if (val > 0) return "#34d399"; // green
          if (val < 0) return "#f87171"; // red
          return "#64748b"; // gray
        };

        const style = getScoreStyle(score);
        const valueLabel = getValueLabel(score);

        return (
          <div className="relative score-tooltip-trigger">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold cursor-help"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                color: style.text,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: style.text }}
              />
              {score}
            </div>
            {/* Tooltip - positioned below to avoid header overlap */}
            <div className="score-tooltip absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 invisible pointer-events-none transition-opacity duration-150">
              {/* Arrow pointing up */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: "6px solid rgba(15, 20, 25, 0.98)",
                }}
              />
              <div
                className="px-3 py-2.5 rounded-lg text-[10px] whitespace-nowrap shadow-xl"
                style={{
                  background: "rgba(15, 20, 25, 0.98)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="font-semibold text-white mb-2" style={{ color: style.text }}>
                  {valueLabel} Value
                </div>
                {breakdown ? (
                  <div className="space-y-1.5">
                    {/* Score Components */}
                    <div className="text-white/50 text-[9px] uppercase tracking-wide mb-1">
                      Score Components
                    </div>
                    <div className="flex justify-between gap-6 text-white/70">
                      <span>Value Score:</span>
                      <span className="text-cyan-400 font-medium">{breakdown.valueScore}</span>
                    </div>
                    <div className="flex justify-between gap-6 text-white/70">
                      <span>Efficiency Bonus:</span>
                      <span style={{ color: getModifierColor(breakdown.efficiencyBonus) }}>
                        {formatModifier(breakdown.efficiencyBonus)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6 text-white/70">
                      <span>Affordability:</span>
                      <span style={{ color: getModifierColor(breakdown.affordabilityMod) }}>
                        {formatModifier(breakdown.affordabilityMod)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6 text-white/70">
                      <span>Brand Bonus:</span>
                      <span style={{ color: getModifierColor(breakdown.brandBonus) }}>
                        {formatModifier(breakdown.brandBonus)}
                      </span>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-white/10 pt-1.5 mt-1.5">
                      <div className="flex justify-between gap-6 font-semibold">
                        <span className="text-white/70">Final Score:</span>
                        <span style={{ color: style.text }}>{score}</span>
                      </div>
                    </div>
                    {/* Cost Ratio */}
                    <div className="border-t border-white/10 pt-1.5 mt-1.5">
                      <div className="flex justify-between gap-6 text-white/50 text-[9px]">
                        <span>Cost Ratio:</span>
                        <span>{(breakdown.costRatio * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between gap-6 text-white/50 text-[9px]">
                        <span>Payments:</span>
                        <span>{breakdown.totalPayments} × £{monthlyRental}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-white/70">
                    <div className="flex justify-between gap-4">
                      <span>Monthly:</span>
                      <span className="text-white">£{monthlyRental}</span>
                    </div>
                    <div className="text-white/40 text-[9px] mt-2">
                      Score breakdown not available
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* CSS for hover - scoped to this element only */}
            <style jsx>{`
              .score-tooltip-trigger:hover .score-tooltip {
                opacity: 1;
                visibility: visible;
                z-index: 9999;
              }
            `}</style>
          </div>
        );
      },
      size: 80,
      enableSorting: true,
    }),
  ] as ColumnDef<VehicleTableRow, unknown>[];
}

// Default column order
export const defaultColumnOrder = [
  "select",
  "star",
  "logo",
  "vehicleId",
  "manufacturer",
  "model",
  "variant",
  "fuelType",
  "p11dGbp",
  "score",
  "bestFunder",
  "marketPosition",
  "otrOpportunity",
  "strength",
  "integrity",
];

// Default column visibility
export const defaultColumnVisibility: Record<string, boolean> = {
  select: true,
  star: true,
  logo: true,
  vehicleId: true,
  manufacturer: true,
  model: true,
  variant: true,
  fuelType: true,
  p11dGbp: true,
  score: true,
  bestFunder: true,
  marketPosition: true,
  otrOpportunity: true,
  strength: true,
  integrity: true,
};
