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
} from "./cells";

const columnHelper = createColumnHelper<VehicleTableRow>();

interface ColumnOptions {
  onToggleSpecialOffer?: (vehicleId: string, isSpecialOffer: boolean) => void;
}

export function createRateExplorerColumns(options: ColumnOptions = {}): ColumnDef<VehicleTableRow, unknown>[] {
  const { onToggleSpecialOffer } = options;

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

    // Score with tooltip showing calculation
    columnHelper.accessor("bestScore", {
      id: "score",
      header: "Score",
      cell: ({ getValue, row }) => {
        const score = getValue();
        const p11d = row.original.p11dGbp;
        const monthlyRental = row.original.bestFunder.priceGbp;
        const term = 36; // Default comparison term

        // Calculate cost ratio for display
        const totalCost = monthlyRental * term;
        const costRatio = p11d > 0 ? ((totalCost / p11d) * 100).toFixed(1) : null;

        // Get value label
        const getValueLabel = (s: number) => {
          if (s >= 80) return "Exceptional";
          if (s >= 65) return "Great";
          if (s >= 50) return "Good";
          if (s >= 40) return "Fair";
          return "Average";
        };

        const getScoreStyle = (s: number) => {
          if (s >= 80) return { bg: "rgba(52, 211, 153, 0.2)", border: "rgba(52, 211, 153, 0.4)", text: "#34d399" };
          if (s >= 65) return { bg: "rgba(45, 212, 191, 0.2)", border: "rgba(45, 212, 191, 0.4)", text: "#2dd4bf" };
          if (s >= 50) return { bg: "rgba(6, 182, 212, 0.2)", border: "rgba(6, 182, 212, 0.4)", text: "#06b6d4" };
          if (s >= 40) return { bg: "rgba(250, 204, 21, 0.2)", border: "rgba(250, 204, 21, 0.4)", text: "#facc15" };
          return { bg: "rgba(100, 116, 139, 0.2)", border: "rgba(100, 116, 139, 0.4)", text: "#64748b" };
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
                className="px-3 py-2 rounded-lg text-[10px] whitespace-nowrap shadow-xl"
                style={{
                  background: "rgba(15, 20, 25, 0.98)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="font-semibold text-white mb-1.5" style={{ color: style.text }}>
                  {valueLabel} Value
                </div>
                <div className="space-y-1 text-white/70">
                  <div className="flex justify-between gap-4">
                    <span>Monthly:</span>
                    <span className="text-white">£{monthlyRental}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>P11D:</span>
                    <span className="text-white">£{p11d.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Term:</span>
                    <span className="text-white">{term} months</span>
                  </div>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <div className="flex justify-between gap-4">
                      <span>Total Cost:</span>
                      <span className="text-white">£{totalCost.toLocaleString()}</span>
                    </div>
                    {costRatio && (
                      <div className="flex justify-between gap-4">
                        <span>Cost/P11D:</span>
                        <span className="text-white">{costRatio}%</span>
                      </div>
                    )}
                  </div>
                </div>
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
  strength: true,
  integrity: true,
};
