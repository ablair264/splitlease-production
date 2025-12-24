"use client";

import { cn } from "@/lib/utils";
import { Flame, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/db/schema";

interface ScoreBadgeProps {
  score: number;
  term?: number; // 24, 36, 48, 60
  showTerm?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  breakdown?: ScoreBreakdown | null;
  showBreakdownOnHover?: boolean;
  monthlyRental?: number;
}

/**
 * Score badge with color coding based on composite value score.
 *
 * Score ranges (aligned with scoring.ts):
 * - 90+: Exceptional (emerald with flame)
 * - 75-89: Great (green with star)
 * - 60-74: Good (lime with trend up)
 * - 45-59: Fair (yellow)
 * - 30-44: Average (orange)
 * - <30: Poor (gray with trend down)
 */
export function ScoreBadge({
  score,
  term,
  showTerm = false,
  size = "md",
  showIcon = true,
  className,
  breakdown,
  showBreakdownOnHover = false,
  monthlyRental,
}: ScoreBadgeProps) {
  const getScoreConfig = (s: number) => {
    if (s >= 90) return {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: Flame,
      label: "Exceptional"
    };
    if (s >= 75) return {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/30",
      icon: Star,
      label: "Great"
    };
    if (s >= 60) return {
      bg: "bg-lime-500/20",
      text: "text-lime-400",
      border: "border-lime-500/30",
      icon: TrendingUp,
      label: "Good"
    };
    if (s >= 45) return {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      icon: Minus,
      label: "Fair"
    };
    if (s >= 30) return {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
      icon: TrendingDown,
      label: "Average"
    };
    return {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      border: "border-gray-500/30",
      icon: TrendingDown,
      label: "Poor"
    };
  };

  const config = getScoreConfig(score);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs gap-1",
    md: "px-2 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  const iconSizes = { sm: 12, md: 14, lg: 16 };

  // Format bonus/modifier with sign
  const formatModifier = (val: number) => {
    if (val > 0) return `+${val}`;
    if (val < 0) return `${val}`;
    return "0";
  };

  // Get color for bonus/modifier
  const getModifierColor = (val: number) => {
    if (val > 0) return "text-emerald-400";
    if (val < 0) return "text-red-400";
    return "text-gray-400";
  };

  const badge = (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-semibold",
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      <span>{score}</span>
      {showTerm && term && (
        <span className="opacity-70 text-[0.75em]">/{term}mo</span>
      )}
    </div>
  );

  if (!showBreakdownOnHover) {
    return badge;
  }

  return (
    <div className="relative group">
      {badge}
      {/* Tooltip showing breakdown */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-opacity duration-150 z-50">
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
          <div className={cn("font-semibold mb-2", config.text)}>
            {config.label} Value
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
                <span className={getModifierColor(breakdown.efficiencyBonus)}>
                  {formatModifier(breakdown.efficiencyBonus)}
                </span>
              </div>
              <div className="flex justify-between gap-6 text-white/70">
                <span>Affordability:</span>
                <span className={getModifierColor(breakdown.affordabilityMod)}>
                  {formatModifier(breakdown.affordabilityMod)}
                </span>
              </div>
              <div className="flex justify-between gap-6 text-white/70">
                <span>Brand Bonus:</span>
                <span className={getModifierColor(breakdown.brandBonus)}>
                  {formatModifier(breakdown.brandBonus)}
                </span>
              </div>
              {/* Divider */}
              <div className="border-t border-white/10 pt-1.5 mt-1.5">
                <div className="flex justify-between gap-6 font-semibold">
                  <span className="text-white/70">Final Score:</span>
                  <span className={config.text}>{score}</span>
                </div>
              </div>
              {/* Cost Ratio */}
              <div className="border-t border-white/10 pt-1.5 mt-1.5">
                <div className="flex justify-between gap-6 text-white/50 text-[9px]">
                  <span>Cost Ratio:</span>
                  <span>{(breakdown.costRatio * 100).toFixed(1)}%</span>
                </div>
                {monthlyRental && (
                  <div className="flex justify-between gap-6 text-white/50 text-[9px]">
                    <span>Payments:</span>
                    <span>{breakdown.totalPayments} × £{monthlyRental.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-white/70">
              {monthlyRental && (
                <div className="flex justify-between gap-4">
                  <span>Monthly:</span>
                  <span className="text-white">£{monthlyRental.toFixed(2)}</span>
                </div>
              )}
              <div className="text-white/40 text-[9px] mt-2">
                Score breakdown not available
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
