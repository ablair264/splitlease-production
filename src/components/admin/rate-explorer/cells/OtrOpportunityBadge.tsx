"use client";

import type { TermsHolderOtr } from "../types";

interface OtrOpportunityBadgeProps {
  data: TermsHolderOtr | null;
}

export function OtrOpportunityBadge({ data }: OtrOpportunityBadgeProps) {
  if (!data) {
    return (
      <span className="text-white/20 text-xs">-</span>
    );
  }

  // Color based on savings percentage
  const getStyle = (percent: number) => {
    if (percent >= 10) return { bg: "rgba(52, 211, 153, 0.2)", border: "rgba(52, 211, 153, 0.4)", text: "#34d399" }; // Emerald - great savings
    if (percent >= 5) return { bg: "rgba(74, 222, 128, 0.2)", border: "rgba(74, 222, 128, 0.4)", text: "#4ade80" }; // Green - good savings
    if (percent >= 2) return { bg: "rgba(163, 230, 53, 0.2)", border: "rgba(163, 230, 53, 0.4)", text: "#a3e635" }; // Lime - moderate savings
    return { bg: "rgba(250, 204, 21, 0.2)", border: "rgba(250, 204, 21, 0.4)", text: "#facc15" }; // Yellow - small savings
  };

  const style = getStyle(data.savingsPercent);

  return (
    <div className="relative otr-tooltip-trigger">
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold cursor-help"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.text,
        }}
      >
        {/* Lightning bolt icon */}
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
        <span>-£{data.savingsGbp.toLocaleString()}</span>
      </div>
      {/* Tooltip */}
      <div className="otr-tooltip absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 invisible pointer-events-none transition-opacity duration-150 z-50">
        {/* Arrow */}
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
          <div className="font-semibold text-cyan-400 mb-2">
            Terms Holder Opportunity
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-6 text-white/70">
              <span>Provider OTR:</span>
              <span className="text-white">£{data.providerOtr.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-6 text-white/70">
              <span>Terms Holder OTR:</span>
              <span className="text-emerald-400 font-medium">£{data.termsOtr.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/10 pt-1.5 mt-1.5">
              <div className="flex justify-between gap-6 font-semibold">
                <span className="text-white/70">Potential Saving:</span>
                <span style={{ color: style.text }}>
                  £{data.savingsGbp.toLocaleString()} ({data.savingsPercent}%)
                </span>
              </div>
            </div>
            <div className="text-white/40 text-[9px] mt-2 max-w-[180px]">
              Re-run quote with terms holder OTR for potentially better rate
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .otr-tooltip-trigger:hover .otr-tooltip {
          opacity: 1;
          visibility: visible;
        }
      `}</style>
    </div>
  );
}
