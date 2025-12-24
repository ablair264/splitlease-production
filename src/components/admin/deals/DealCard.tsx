"use client";

import Image from "next/image";
import { ArrowLeftRight, Eye, Fuel, Plug, Star, Zap, Battery } from "lucide-react";
import { ScoreBadge } from "@/components/admin/shared";
import { cn } from "@/lib/utils";
import type { DealCard as DealCardType } from "./types";

const fuelIconMap: Record<string, JSX.Element> = {
  Petrol: <Zap className="h-3.5 w-3.5" />,
  Diesel: <Fuel className="h-3.5 w-3.5" />,
  Electric: <Plug className="h-3.5 w-3.5" />,
  Hybrid: <Battery className="h-3.5 w-3.5" />,
};

export function DealCard({ deal }: { deal: DealCardType }) {
  const {
    manufacturer,
    model,
    variant,
    fuelType,
    co2Gkm,
    imageUrl,
    score,
    bestDeal,
    providerMiniGrid,
  } = deal;

  const heroImage = imageUrl || "/images/car-placeholder.webp";

  return (
    <div className="group rounded-2xl border border-gray-800 bg-[#161c24] overflow-hidden shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)] hover:border-[#79d5e9]/40">
      <div className="relative h-56 bg-gradient-to-b from-[#9aa7b1] via-[#dfe5ea] to-[#f8fafc]">
        <div className="absolute inset-0 rounded-2xl border border-[#79d5e9]/40 pointer-events-none shadow-[inset_0_0_20px_rgba(121,213,233,0.2)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),_transparent_60%)]" />
        <Image
          src={heroImage}
          alt={`${manufacturer} ${model}`}
          fill
          className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.35)]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3">
          <ScoreBadge score={score} size="sm" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white truncate">
            {manufacturer} {model}
          </h3>
          <p className="text-xs text-gray-400 truncate">{variant || "N/A"}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {fuelType && (
              <span className="inline-flex items-center gap-1 text-gray-400">
                {fuelIconMap[fuelType] || <Fuel className="h-3.5 w-3.5" />}
                {fuelType}
              </span>
            )}
            {fuelType && co2Gkm !== null && <span>/</span>}
            {co2Gkm !== null && <span>{co2Gkm}g/km</span>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-white font-semibold">
            &pound;{bestDeal.monthlyRentalGbp.toLocaleString()}/m
          </div>
          <div className="text-xs text-gray-400">
            via {bestDeal.providerName}
          </div>
        </div>

        <div className="mt-1 text-xs text-gray-500">
          {bestDeal.term}m / {bestDeal.annualMileage.toLocaleString()} miles / {bestDeal.paymentPlan}
        </div>

        {providerMiniGrid.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
            {providerMiniGrid.map((item) => (
              <span
                key={item.providerCode}
                className={cn(
                  "rounded-full border border-gray-700 px-2 py-0.5",
                  item.isBest && "border-emerald-500/40 text-emerald-200"
                )}
              >
                {item.providerName}:{" "}
                {item.monthlyRentalGbp ? (
                  <>
                    &pound;{item.monthlyRentalGbp}
                  </>
                ) : (
                  "N/A"
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-gray-800 bg-[#121821] text-xs uppercase tracking-wide text-gray-400">
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors",
            "hover:text-white hover:bg-[#1a1f2a]"
          )}
        >
          <Star className="h-4 w-4" />
          Feature
        </button>
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors border-x border-gray-800",
            "hover:text-white hover:bg-[#1a1f2a]"
          )}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Compare
        </button>
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors",
            "hover:text-white hover:bg-[#1a1f2a]"
          )}
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </div>
    </div>
  );
}
