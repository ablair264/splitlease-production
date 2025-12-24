"use client";

import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Deal {
  id: string;
  vehicleId: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  monthlyRental: number;
  term: number;
  annualMileage: number;
  providerCode: string;
  contractType: string;
  score: number;
}

interface TopDealsCardProps {
  deals: Deal[];
  isLoading?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 90) return "bg-[#4d9869] text-white";
    if (score >= 70) return "bg-[#79d5e9] text-[#0f1419]";
    if (score >= 50) return "bg-[#f8d824] text-[#0f1419]";
    return "bg-[#dd4444] text-white";
  };

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
        getScoreColor()
      )}
    >
      {score}
    </div>
  );
}

export function TopDealsCard({ deals, isLoading }: TopDealsCardProps) {
  return (
    <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#79d5e9]" />
          <h3 className="text-base font-semibold text-white">Top Deals This Week</h3>
        </div>
        <Link
          href="/admin/deals"
          className="text-xs text-[#79d5e9] hover:text-[#4daeac] flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-800">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
              <div className="w-6 h-6 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full" />
            </div>
          ))
        ) : deals.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">
            No deals found
          </div>
        ) : (
          deals.map((deal, index) => (
            <div
              key={deal.id}
              className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
            >
              {/* Rank */}
              <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                {index + 1}
              </div>

              {/* Vehicle info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {deal.manufacturer} {deal.model}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  £{deal.monthlyRental.toFixed(0)}/m · {deal.providerCode.toUpperCase()} · {deal.contractType}
                </p>
              </div>

              {/* Score */}
              <ScoreBadge score={deal.score} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
