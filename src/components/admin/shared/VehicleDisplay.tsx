// src/components/admin/shared/VehicleDisplay.tsx
"use client";

import { cn } from "@/lib/utils";

interface VehicleDisplayProps {
  variant: string | null;
  manufacturer: string;
  model: string;
  capCode?: string | null;
  showCapCode?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Variant-first vehicle display component.
 * For pricing team, variant is the primary identifier.
 *
 * Display order: Variant (primary) → Make Model (secondary)
 * Example: "118i M Sport 5dr Step Auto" → "BMW 1 Series"
 */
export function VehicleDisplay({
  variant,
  manufacturer,
  model,
  capCode,
  showCapCode = false,
  size = "md",
  className,
}: VehicleDisplayProps) {
  const sizeClasses = {
    sm: { variant: "text-sm", makeModel: "text-xs" },
    md: { variant: "text-base", makeModel: "text-sm" },
    lg: { variant: "text-lg", makeModel: "text-base" },
  };

  const displayVariant = variant || `${manufacturer} ${model}`;
  const displayMakeModel = variant ? `${manufacturer} ${model}` : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <span
        className={cn(
          "font-semibold text-white leading-tight",
          sizeClasses[size].variant
        )}
      >
        {displayVariant}
      </span>
      {displayMakeModel && (
        <span
          className={cn(
            "text-gray-400 leading-tight",
            sizeClasses[size].makeModel
          )}
        >
          {displayMakeModel}
        </span>
      )}
      {showCapCode && capCode && (
        <span className="text-xs text-gray-500 font-mono mt-0.5">
          {capCode}
        </span>
      )}
    </div>
  );
}
