"use client";

import { Trophy, Medal, Award, Minus } from "lucide-react";

export type MarketRank = 1 | 2 | 3 | number;

interface MarketRankBadgeProps {
  rank: MarketRank;
  totalCompetitors: number;
  className?: string;
}

interface RankConfig {
  icon: typeof Trophy;
  bg: string;
  border: string;
  text: string;
  label: string;
}

const RANK_CONFIGS: Record<1 | 2 | 3, RankConfig> = {
  1: {
    icon: Trophy,
    bg: "rgba(250, 204, 21, 0.15)",
    border: "rgba(250, 204, 21, 0.4)",
    text: "#facc15",
    label: "1st",
  },
  2: {
    icon: Medal,
    bg: "rgba(156, 163, 175, 0.15)",
    border: "rgba(156, 163, 175, 0.4)",
    text: "#9ca3af",
    label: "2nd",
  },
  3: {
    icon: Award,
    bg: "rgba(205, 127, 50, 0.15)",
    border: "rgba(205, 127, 50, 0.4)",
    text: "#cd7f32",
    label: "3rd",
  },
};

const DEFAULT_CONFIG: RankConfig = {
  icon: Minus,
  bg: "rgba(100, 116, 139, 0.1)",
  border: "rgba(100, 116, 139, 0.2)",
  text: "#64748b",
  label: "",
};

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function MarketRankBadge({ rank, totalCompetitors, className = "" }: MarketRankBadgeProps) {
  // No ranking if no competitors
  if (totalCompetitors === 0) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${className}`}
        style={{ background: "rgba(100, 116, 139, 0.1)" }}
        title="No competitor data"
      >
        <span className="text-[10px] text-white/40">-</span>
      </div>
    );
  }

  const isTopThree = rank === 1 || rank === 2 || rank === 3;
  const config = isTopThree ? RANK_CONFIGS[rank as 1 | 2 | 3] : DEFAULT_CONFIG;
  const Icon = config.icon;
  const label = isTopThree ? config.label : getOrdinalSuffix(rank);

  const tooltipText = `Ranked ${getOrdinalSuffix(rank)} out of ${totalCompetitors + 1} (including us)`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${className}`}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
      title={tooltipText}
    >
      {isTopThree && (
        <Icon
          size={12}
          style={{ color: config.text }}
        />
      )}
      <span
        className="text-[10px] font-semibold"
        style={{ color: config.text }}
      >
        {label}
      </span>
      <span className="text-[9px] text-white/40">
        /{totalCompetitors + 1}
      </span>
    </div>
  );
}

// Compact dot version
export function MarketRankDot({ rank, totalCompetitors }: Pick<MarketRankBadgeProps, "rank" | "totalCompetitors">) {
  if (totalCompetitors === 0) {
    return (
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: "rgba(100, 116, 139, 0.3)" }}
        title="No competitor data"
      />
    );
  }

  const isTopThree = rank === 1 || rank === 2 || rank === 3;
  const config = isTopThree ? RANK_CONFIGS[rank as 1 | 2 | 3] : DEFAULT_CONFIG;

  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ background: config.text }}
      title={`Ranked ${getOrdinalSuffix(rank)} of ${totalCompetitors + 1}`}
    />
  );
}
