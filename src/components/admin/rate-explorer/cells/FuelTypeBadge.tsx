"use client";

import { Zap, Fuel, Leaf } from "lucide-react";

interface FuelTypeBadgeProps {
  fuelType: string;
}

export function FuelTypeBadge({ fuelType }: FuelTypeBadgeProps) {
  if (!fuelType) {
    return <span className="text-white/40 text-xs">-</span>;
  }

  const lower = fuelType.toLowerCase();
  const isElectric = lower.includes("electric") || lower === "ev";
  const isHybrid = lower.includes("hybrid") || lower.includes("phev");

  // Abbreviation map for fuel types
  const FUEL_ABBREVIATIONS: Record<string, string> = {
    "Diesel": "Diesel",
    "Diesel (Mild Hybrid)": "D MH",
    "Diesel Parallel PHEV": "D PHEV",
    "Diesel/PlugIn Elec Hybrid": "D PHEV",
    "Electric": "EV",
    "Electric Petrol (REX)": "EV REX",
    "Hybrid": "HEV",
    "Petrol": "Petrol",
    "Petrol (Mild Hybrid)": "P MH",
    "Petrol Parallel PHEV": "P PHEV",
    "Petrol Series PHEV": "P PHEV",
    "Petrol/Electric Hybrid": "P HEV",
    "Petrol/LPG": "P/LPG",
    "Petrol/PlugIn Elec Hybrid": "P PHEV",
  };

  const shortFuel = FUEL_ABBREVIATIONS[fuelType] || fuelType;

  const getConfig = () => {
    if (isElectric) return {
      bg: "rgba(34, 197, 94, 0.15)",
      text: "#22c55e",
      icon: Zap,
    };
    if (isHybrid) return {
      bg: "rgba(163, 230, 53, 0.15)",
      text: "#a3e635",
      icon: Leaf,
    };
    return {
      bg: "rgba(255, 255, 255, 0.05)",
      text: "rgba(255, 255, 255, 0.6)",
      icon: Fuel,
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ background: config.bg, color: config.text }}
      title={fuelType}
    >
      <Icon className="w-3 h-3" />
      <span>{shortFuel}</span>
    </div>
  );
}
