"use client";

interface BestFunderBadgeProps {
  code: string;
  name: string;
  priceGbp: number;
}

const PROVIDER_STYLES: Record<string, { bg: string; text: string }> = {
  lex: { bg: "rgba(121, 213, 233, 0.2)", text: "#79d5e9" },
  ogilvie: { bg: "rgba(97, 188, 142, 0.2)", text: "#61bc8e" },
  venus: { bg: "rgba(248, 216, 36, 0.2)", text: "#f8d824" },
  drivalia: { bg: "rgba(247, 125, 17, 0.2)", text: "#f77d11" },
};

export function BestFunderBadge({ code, name, priceGbp }: BestFunderBadgeProps) {
  const style = PROVIDER_STYLES[code] || {
    bg: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff"
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-2 py-1 rounded-md"
      style={{ background: style.bg }}
    >
      <span
        className="text-[10px] font-semibold uppercase"
        style={{ color: style.text }}
        title={name}
      >
        {code.slice(0, 3)}
      </span>
      <span className="text-xs font-semibold text-white">
        {priceGbp.toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
