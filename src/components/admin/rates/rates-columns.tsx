"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { BrowseRate } from "@/lib/rates/types";
import { formatGbp } from "@/lib/rates/types";

const columnHelper = createColumnHelper<BrowseRate>();

export const ratesColumns = [
  columnHelper.accessor("manufacturer", {
    header: "Make",
    cell: (info) => (
      <span className="font-medium text-white text-xs">{info.getValue()}</span>
    ),
    size: 90,
  }),
  columnHelper.accessor("model", {
    header: "Model",
    cell: (info) => <span className="text-white/80 text-xs">{info.getValue()}</span>,
    size: 100,
  }),
  columnHelper.accessor("variant", {
    header: "Variant",
    cell: (info) => (
      <span className="text-white/60 text-xs leading-tight line-clamp-2">{info.getValue() || "-"}</span>
    ),
    size: 200,
  }),
  columnHelper.accessor("providerCode", {
    header: "",
    cell: (info) => {
      const provider = info.getValue();
      const providerStyles: Record<string, { bg: string; text: string; short: string }> = {
        lex: { bg: "rgba(59, 130, 246, 0.2)", text: "#60a5fa", short: "Lex" },
        ogilvie: { bg: "rgba(168, 85, 247, 0.2)", text: "#a78bfa", short: "Og" },
        drivalia: { bg: "rgba(34, 197, 94, 0.2)", text: "#4ade80", short: "Dr" },
      };
      const style = providerStyles[provider] || { bg: "rgba(255, 255, 255, 0.1)", text: "#ffffff", short: provider.slice(0, 2) };
      return (
        <span
          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ background: style.bg, color: style.text }}
          title={provider}
        >
          {style.short}
        </span>
      );
    },
    size: 40,
  }),
  columnHelper.accessor("term", {
    header: "Term",
    cell: (info) => (
      <span className="text-white/80 text-xs">{info.getValue()}m</span>
    ),
    size: 50,
  }),
  columnHelper.accessor("annualMileage", {
    header: "Miles",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="text-white/80 text-xs">
          {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
        </span>
      );
    },
    size: 50,
  }),
  columnHelper.accessor("totalRentalGbp", {
    header: () => (
      <span className="text-cyan-400">Monthly</span>
    ),
    cell: (info) => (
      <span className="font-semibold text-cyan-400 text-xs">
        {formatGbp(info.getValue())}
      </span>
    ),
    sortingFn: "basic",
    size: 85,
  }),
  columnHelper.accessor("valueScore", {
    header: "Value",
    cell: (info) => {
      const score = info.getValue();
      const label = info.row.original.valueLabel;

      // Define value tier styling based on score
      const getTierStyle = (s: number, lbl: string) => {
        if (lbl === "Unknown") return { bg: "rgba(100, 116, 139, 0.1)", border: "rgba(100, 116, 139, 0.2)", text: "#64748b" };
        if (s >= 80) return { bg: "rgba(52, 211, 153, 0.2)", border: "rgba(52, 211, 153, 0.4)", text: "#34d399" };
        if (s >= 65) return { bg: "rgba(74, 222, 128, 0.15)", border: "rgba(74, 222, 128, 0.3)", text: "#4ade80" };
        if (s >= 50) return { bg: "rgba(163, 230, 53, 0.15)", border: "rgba(163, 230, 53, 0.3)", text: "#a3e635" };
        if (s >= 40) return { bg: "rgba(250, 204, 21, 0.15)", border: "rgba(250, 204, 21, 0.3)", text: "#facc15" };
        if (s >= 25) return { bg: "rgba(156, 163, 175, 0.1)", border: "rgba(156, 163, 175, 0.2)", text: "#9ca3af" };
        return { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)", text: "#ef4444" };
      };

      const tier = getTierStyle(score, label);
      // Shorten labels for compact display
      const shortLabel =
        label === "Exceptional" ? "Exc" :
        label === "Average" ? "Avg" :
        label === "Unknown" ? "?" :
        label;

      return (
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold"
          style={{
            background: tier.bg,
            border: `1px solid ${tier.border}`,
            color: tier.text,
          }}
          title={`Score: ${score} - ${label}`}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: tier.text }}
          />
          {shortLabel}
        </div>
      );
    },
    sortingFn: "basic",
    size: 80,
  }),
  columnHelper.accessor("leaseRentalGbp", {
    header: "Lease",
    cell: (info) => (
      <span className="text-white/60 text-xs">
        {formatGbp(info.getValue())}
      </span>
    ),
    size: 80,
  }),
  columnHelper.accessor("serviceRentalGbp", {
    header: "Service",
    cell: (info) => (
      <span className="text-white/60 text-xs">
        {formatGbp(info.getValue())}
      </span>
    ),
    size: 70,
  }),
  columnHelper.accessor("co2Gkm", {
    header: "CO2",
    cell: (info) => {
      const val = info.getValue();
      if (val === null || val === undefined) return <span className="text-white/40 text-xs">-</span>;
      const colorClass = val === 0 ? "text-green-400" : val <= 50 ? "text-green-300" : val <= 100 ? "text-yellow-400" : "text-white/60";
      return <span className={`text-xs ${colorClass}`}>{val}</span>;
    },
    size: 45,
  }),
  columnHelper.accessor("p11dGbp", {
    header: "P11D",
    cell: (info) => (
      <span className="text-white/60 text-xs">
        {formatGbp(info.getValue())}
      </span>
    ),
    size: 80,
  }),
  columnHelper.accessor("fuelType", {
    header: "Fuel",
    cell: (info) => {
      const fuel = info.getValue();
      if (!fuel) return <span className="text-white/40 text-xs">-</span>;
      const isElectric = fuel.toLowerCase().includes("electric");
      // Shorten common fuel type names
      const shortFuel = fuel
        .replace("Petrol (Mild Hybrid)", "Petrol MH")
        .replace("Diesel (Mild Hybrid)", "Diesel MH")
        .replace("Petrol (Plug-in Hybrid)", "PHEV")
        .replace("Diesel (Plug-in Hybrid)", "PHEV D")
        .replace("Electric", "EV");
      return (
        <span className={`text-[10px] ${isElectric ? "text-green-400" : "text-white/60"}`}>
          {shortFuel}
        </span>
      );
    },
    size: 65,
  }),
  columnHelper.accessor("insuranceGroup", {
    header: "Ins",
    cell: (info) => (
      <span className="text-white/60 text-xs">{info.getValue() || "-"}</span>
    ),
    size: 35,
  }),
  columnHelper.accessor("evRangeMiles", {
    header: "Range",
    cell: (info) => {
      const val = info.getValue();
      if (!val) return <span className="text-white/40 text-xs">-</span>;
      return <span className="text-green-400 text-xs">{val}</span>;
    },
    size: 50,
  }),
];
