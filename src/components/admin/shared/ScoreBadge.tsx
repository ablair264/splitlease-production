"use client";

import { cn } from "@/lib/utils";
import { Flame, Star, TrendingUp, TrendingDown } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  term?: number; // 24, 36, 48, 60
  showTerm?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

/**
 * Score badge with color coding based on value score.
 *
 * Score ranges:
 * - 80+: Hot Deal (green with flame)
 * - 65-79: Great (teal with star)
 * - 50-64: Good (cyan)
 * - 40-49: Fair (yellow)
 * - <40: Average (gray)
 */
export function ScoreBadge({
  score,
  term,
  showTerm = false,
  size = "md",
  showIcon = true,
  className,
}: ScoreBadgeProps) {
  const getScoreConfig = (s: number) => {
    if (s >= 80) return {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: Flame,
      label: "Hot"
    };
    if (s >= 65) return {
      bg: "bg-teal-500/20",
      text: "text-teal-400",
      border: "border-teal-500/30",
      icon: Star,
      label: "Great"
    };
    if (s >= 50) return {
      bg: "bg-cyan-500/20",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      icon: TrendingUp,
      label: "Good"
    };
    if (s >= 40) return {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      icon: TrendingUp,
      label: "Fair"
    };
    return {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      border: "border-gray-500/30",
      icon: TrendingDown,
      label: "Average"
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

  return (
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
}
