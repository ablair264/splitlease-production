"use client";

import { TrendingDown, TrendingUp, Minus, Trophy, AlertTriangle } from "lucide-react";

export type MarketPosition = "lowest" | "below-avg" | "average" | "above-avg" | "highest";

interface PricePositionBadgeProps {
  position: MarketPosition;
  percentile: number;
  priceDeltaPercent: number;
  competitorCount: number;
  showDelta?: boolean;
  onClick?: () => void;
}

const POSITION_STYLES: Record<MarketPosition, {
  bg: string;
  text: string;
  label: string;
  icon: typeof TrendingDown;
}> = {
  lowest: {
    bg: "rgba(34, 197, 94, 0.2)",
    text: "#22c55e",
    label: "Lowest",
    icon: Trophy,
  },
  "below-avg": {
    bg: "rgba(59, 130, 246, 0.2)",
    text: "#3b82f6",
    label: "Below Avg",
    icon: TrendingDown,
  },
  average: {
    bg: "rgba(156, 163, 175, 0.2)",
    text: "#9ca3af",
    label: "Average",
    icon: Minus,
  },
  "above-avg": {
    bg: "rgba(249, 115, 22, 0.2)",
    text: "#f97316",
    label: "Above Avg",
    icon: TrendingUp,
  },
  highest: {
    bg: "rgba(239, 68, 68, 0.2)",
    text: "#ef4444",
    label: "Highest",
    icon: AlertTriangle,
  },
};

export function PricePositionBadge({
  position,
  percentile,
  priceDeltaPercent,
  competitorCount,
  showDelta = true,
  onClick,
}: PricePositionBadgeProps) {
  const style = POSITION_STYLES[position];
  const Icon = style.icon;

  // No competitor data available
  if (competitorCount === 0) {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
        style={{ background: "rgba(156, 163, 175, 0.1)" }}
        title="No market data available"
      >
        <span className="text-[10px] text-white/40">No data</span>
      </div>
    );
  }

  const deltaSign = priceDeltaPercent > 0 ? "+" : "";
  const tooltipText = `Market position: ${percentile}th percentile\n${competitorCount} competitor${competitorCount > 1 ? "s" : ""}\n${deltaSign}${priceDeltaPercent}% vs market avg`;

  const handleClick = onClick ? (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  } : undefined;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-help"}`}
      style={{ background: style.bg }}
      title={tooltipText}
      onClick={handleClick}
    >
      <Icon
        size={12}
        style={{ color: style.text }}
      />
      <span
        className="text-[10px] font-semibold"
        style={{ color: style.text }}
      >
        {style.label}
      </span>
      {showDelta && priceDeltaPercent !== 0 && (
        <span
          className="text-[10px] font-medium"
          style={{ color: priceDeltaPercent < 0 ? "#22c55e" : "#ef4444" }}
        >
          {deltaSign}{priceDeltaPercent}%
        </span>
      )}
    </div>
  );
}

// Compact version for table cells with limited space
export function PricePositionDot({
  position,
  percentile,
  competitorCount,
}: Pick<PricePositionBadgeProps, "position" | "percentile" | "competitorCount">) {
  const style = POSITION_STYLES[position];

  if (competitorCount === 0) {
    return (
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: "rgba(156, 163, 175, 0.3)" }}
        title="No market data"
      />
    );
  }

  return (
    <div
      className="w-2 h-2 rounded-full cursor-help"
      style={{ background: style.text }}
      title={`${style.label} (${percentile}th percentile)`}
    />
  );
}
