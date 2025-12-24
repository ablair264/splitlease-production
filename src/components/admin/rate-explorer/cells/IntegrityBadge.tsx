"use client";

import { Clock } from "lucide-react";

interface IntegrityBadgeProps {
  days: number;
}

export function IntegrityBadge({ days }: IntegrityBadgeProps) {
  const getConfig = (d: number) => {
    if (d <= 7) return {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.3)",
      text: "#22c55e",
      label: "Fresh",
    };
    if (d <= 14) return {
      bg: "rgba(163, 230, 53, 0.15)",
      border: "rgba(163, 230, 53, 0.3)",
      text: "#a3e635",
      label: "Recent",
    };
    if (d <= 30) return {
      bg: "rgba(250, 204, 21, 0.15)",
      border: "rgba(250, 204, 21, 0.3)",
      text: "#facc15",
      label: "Aging",
    };
    return {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.3)",
      text: "#ef4444",
      label: "Stale",
    };
  };

  const config = getConfig(days);
  const displayDays = days >= 999 ? "N/A" : `${days}d`;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
      }}
      title={`Rate data is ${days} days old`}
    >
      <Clock className="w-3 h-3" />
      <span>{displayDays}</span>
    </div>
  );
}
