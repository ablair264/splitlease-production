"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableCardProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  headerRight?: ReactNode;
  accentColor?: string;
}

export function ExpandableCard({
  title,
  icon,
  defaultExpanded = true,
  children,
  headerRight,
  accentColor = "#79d5e9",
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: accentColor }}>{icon}</span>}
          <h3 className="text-white font-medium">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-white/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </button>
      {isExpanded && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
