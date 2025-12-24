"use client";

interface StrengthIndicatorProps {
  providerCount: number;
  maxProviders?: number;
}

export function StrengthIndicator({ providerCount, maxProviders = 5 }: StrengthIndicatorProps) {
  // Calculate color based on provider count (1=red, 5=green)
  const ratio = Math.min(providerCount, maxProviders) / maxProviders;

  const getColor = (r: number) => {
    if (r <= 0.2) return { bg: "rgba(239, 68, 68, 0.3)", fill: "#ef4444" }; // Red
    if (r <= 0.4) return { bg: "rgba(249, 115, 22, 0.3)", fill: "#f97316" }; // Orange
    if (r <= 0.6) return { bg: "rgba(250, 204, 21, 0.3)", fill: "#facc15" }; // Yellow
    if (r <= 0.8) return { bg: "rgba(163, 230, 53, 0.3)", fill: "#a3e635" }; // Lime
    return { bg: "rgba(34, 197, 94, 0.3)", fill: "#22c55e" }; // Green
  };

  const color = getColor(ratio);
  const widthPercent = ratio * 100;

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-16 h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255, 255, 255, 0.1)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${widthPercent}%`,
            background: color.fill,
          }}
        />
      </div>
      <span className="text-xs text-white/60 font-medium w-4">
        {providerCount}
      </span>
    </div>
  );
}
