"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { ScoreBadge } from "@/components/admin/shared";
import { cn } from "@/lib/utils";

interface ProviderRate {
  provider: string;
  providerCode: string;
  chPrice: number | null;
  pchPrice: number | null;
  score: number;
  isBest?: boolean;
}

interface VehicleRateCardProps {
  id: string;
  manufacturer: string;
  model: string;
  variant: string;
  capCode?: string;
  fuelType?: string;
  transmission?: string;
  co2?: number;
  p11d: number;
  imageUrl?: string;
  bestPrice: number;
  bestProvider: string;
  providerCount: number;
  rateCount: number;
  score: number;
  providerRates: ProviderRate[];
  defaultExpanded?: boolean;
}

export function VehicleRateCard({
  id,
  manufacturer,
  model,
  variant,
  capCode,
  fuelType,
  transmission,
  co2,
  p11d,
  imageUrl,
  bestPrice,
  bestProvider,
  providerCount,
  rateCount,
  score,
  providerRates,
  defaultExpanded = false,
}: VehicleRateCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formatP11d = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className={cn(
        "bg-[#161c24] rounded-xl border overflow-hidden transition-all duration-200",
        expanded ? "border-[#79d5e9]/30" : "border-gray-800 hover:border-gray-700"
      )}
    >
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Vehicle Image */}
          <div className="relative w-24 h-24 bg-gray-900 rounded-lg overflow-hidden shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${manufacturer} ${model}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-base truncate">
                  {manufacturer} {model}
                </h3>
                <p className="text-sm text-gray-400 truncate mt-0.5">{variant}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  {capCode && <span>{capCode}</span>}
                  {capCode && fuelType && <span>·</span>}
                  {fuelType && <span>{fuelType}</span>}
                  {fuelType && transmission && <span>·</span>}
                  {transmission && <span>{transmission}</span>}
                  {transmission && co2 !== undefined && <span>·</span>}
                  {co2 !== undefined && <span>{co2}g/km</span>}
                </div>
              </div>

              {/* Score Badge */}
              <ScoreBadge score={score} size="md" />
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="text-gray-400">
                <span className="text-white font-medium">{formatP11d(p11d)}</span>
                <span className="ml-1">P11D</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="text-gray-400">
                Best: <span className="text-[#79d5e9] font-semibold">£{bestPrice.toLocaleString()}/m</span>
                <span className="ml-1">({bestProvider})</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="text-gray-400">
                <span className="text-white">{providerCount}</span> providers
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="text-gray-400">
                <span className="text-white">{rateCount}</span> rates
              </div>
            </div>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "self-center p-2 rounded-lg transition-colors",
              expanded
                ? "bg-[#79d5e9]/10 text-[#79d5e9]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Provider Comparison */}
      {expanded && (
        <div className="border-t border-gray-800 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700">
                  Provider
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700">
                  CH
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700">
                  PCH
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-700">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {providerRates.map((rate) => (
                <tr
                  key={rate.providerCode}
                  className="border-b border-gray-800 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {rate.provider}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {rate.chPrice
                      ? `£${rate.chPrice.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-300">
                    {rate.pchPrice
                      ? `£${rate.pchPrice.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ScoreBadge score={rate.score} size="sm" />
                      {rate.isBest && (
                        <Check className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
