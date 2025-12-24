"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Car,
  Sparkles,
  RefreshCw,
  Building2,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Star,
  Crown,
  Zap,
  Fuel,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";

interface DashboardStats {
  alerts: Array<{ type: string; message: string; count: number }>;
  hasAlerts: boolean;
  kpis: {
    vehiclesWithRates: number;
    hotDeals: number;
    rateFreshness: number;
    providerCount: number;
  };
  bestDeals: Array<{
    rank: number;
    capCode: string;
    manufacturer: string;
    model: string;
    variant: string | null;
    displayName: string;
    fuelType: string | null;
    monthlyPriceGbp: number;
    p11dGbp: number;
    providerCode: string;
    providerName: string;
    term: number;
    mileage: number;
    score: number;
    scoreLabel: string;
    imageUrl: string | null;
  }>;
  importHealth: Array<{
    providerCode: string;
    providerName: string;
    latestImports: number;
    latestRates: number;
    staleImports: number;
    hasIssues: boolean;
    lastImport: string;
  }>;
  rateDistribution: Array<{
    providerCode: string;
    providerName: string;
    rateCount: number;
    vehicleCount: number;
  }>;
  contractBreakdown: Array<{
    contractType: string;
    count: number;
  }>;
  appliedFilters: {
    contractType: string;
    term: number;
    mileage: number;
  };
}

const CONTRACT_TYPES = [
  { value: "CHNM", label: "CH (No Maint)" },
  { value: "CH", label: "CH (Maint)" },
  { value: "PCHNM", label: "PCH (No Maint)" },
  { value: "PCH", label: "PCH (Maint)" },
];

export default function DashboardPage() {
  const [contractType, setContractType] = useState("CHNM");
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", contractType, term, mileage],
    queryFn: async () => {
      const params = new URLSearchParams({
        contractType,
        term: term.toString(),
        mileage: mileage.toString(),
      });
      const res = await fetch(`/api/admin/dashboard/stats?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });

  // Feature deal mutation
  const featureMutation = useMutation({
    mutationFn: async (deal: DashboardStats["bestDeals"][0]) => {
      const res = await fetch("/api/admin/deals/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capCode: deal.capCode,
          manufacturer: deal.manufacturer,
          model: deal.model,
          variant: deal.variant,
          fuelType: deal.fuelType,
          providerCode: deal.providerCode,
          monthlyPrice: deal.monthlyPriceGbp,
          term,
          mileage,
          contractType,
          score: deal.score,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to feature deal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const maxRateCount = Math.max(
    ...(stats?.rateDistribution?.map((p) => p.rateCount) || [1]),
    1
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Pricing Dashboard</h1>
          <p className="text-sm text-gray-400">
            Overview of rates, deals, and provider performance
          </p>
        </div>

        {/* Contract Type Toggle */}
        <div className="flex items-center gap-1 md:gap-2 bg-[#121821] rounded-xl p-1 border border-gray-800 overflow-x-auto">
          {CONTRACT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setContractType(type.value)}
              className={cn(
                "px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap",
                contractType === type.value
                  ? "bg-cyan-500 text-[#0f1419]"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      {stats?.hasAlerts && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-400">Attention Required</h3>
              <ul className="mt-1 space-y-1">
                {stats.alerts.map((alert, i) => (
                  <li key={i} className="text-sm text-amber-300/80 flex items-center gap-2">
                    {alert.type === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {alert.count} {alert.message}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/admin/ratesheets"
              className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View imports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error instanceof Error ? error.message : "An error occurred"}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Vehicles with Rates */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 p-3 md:p-5">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="p-2 md:p-2.5 bg-cyan-500/10 rounded-lg">
              <Car className="h-4 w-4 md:h-5 md:w-5 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {isLoading ? "—" : stats?.kpis.vehiclesWithRates.toLocaleString()}
          </div>
          <div className="text-xs md:text-sm text-gray-400">Vehicles with Rates</div>
        </div>

        {/* Hot Deals */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 p-3 md:p-5">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="p-2 md:p-2.5 bg-emerald-500/10 rounded-lg">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
            </div>
            <span className="text-[10px] md:text-xs text-emerald-400 bg-emerald-500/10 px-1.5 md:px-2 py-0.5 rounded-full">
              80+
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {isLoading ? "—" : stats?.kpis.hotDeals.toLocaleString()}
          </div>
          <div className="text-xs md:text-sm text-gray-400">Hot Deals</div>
        </div>

        {/* Rate Freshness */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 p-3 md:p-5">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="p-2 md:p-2.5 bg-teal-500/10 rounded-lg">
              <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-teal-400" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {isLoading ? "—" : `${stats?.kpis.rateFreshness}%`}
          </div>
          <div className="text-xs md:text-sm text-gray-400">Rate Freshness</div>
        </div>

        {/* Providers */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 p-3 md:p-5">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="p-2 md:p-2.5 bg-indigo-500/10 rounded-lg">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">
            {isLoading ? "—" : stats?.kpis.providerCount}
          </div>
          <div className="text-xs md:text-sm text-gray-400">Active Providers</div>
        </div>
      </div>

      {/* Contract Breakdown */}
      {stats?.contractBreakdown && stats.contractBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stats.contractBreakdown.map((contract) => (
            <div
              key={contract.contractType}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 border transition-colors cursor-pointer",
                contractType === contract.contractType
                  ? "bg-cyan-500/10 border-cyan-500/30"
                  : "bg-[#1a1f2a] border-gray-800 hover:border-gray-700"
              )}
              onClick={() => setContractType(contract.contractType)}
            >
              <span className="text-xs font-semibold text-gray-400 uppercase">
                {contract.contractType}:
              </span>
              <span className="text-sm font-bold text-white">
                {contract.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Best Deals Table */}
      <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Crown className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-semibold text-white">Today's Best Deals</h2>
            <span className="text-xs text-gray-500">
              {term}mo / {(mileage / 1000).toFixed(0)}k mi
            </span>
          </div>
          <Link
            href="/admin/deals"
            className="text-xs md:text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Manage <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-4 md:p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats?.bestDeals && stats.bestDeals.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-800">
              {stats.bestDeals.map((deal) => (
                <div key={deal.capCode} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="shrink-0">
                      {deal.rank <= 3 ? (
                        <div
                          className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs",
                            deal.rank === 1 && "bg-amber-500/20 text-amber-400",
                            deal.rank === 2 && "bg-gray-400/20 text-gray-300",
                            deal.rank === 3 && "bg-orange-500/20 text-orange-400"
                          )}
                        >
                          {deal.rank}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs w-6 text-center inline-block">{deal.rank}</span>
                      )}
                    </div>

                    {/* Vehicle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">{deal.manufacturer}</div>
                      <div className="font-medium text-white text-sm truncate">{deal.displayName}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {deal.fuelType && (
                          <span className="flex items-center gap-1">
                            {deal.fuelType === "Electric" ? (
                              <Zap className="h-3 w-3 text-green-400" />
                            ) : (
                              <Fuel className="h-3 w-3" />
                            )}
                            {deal.fuelType}
                          </span>
                        )}
                        <span className="text-gray-600">•</span>
                        <span>{deal.providerName}</span>
                      </div>
                    </div>

                    {/* Price & Score */}
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-white text-sm">£{deal.monthlyPriceGbp}/mo</div>
                      <ScoreBadge score={deal.score} size="sm" />
                    </div>
                  </div>

                  {/* Feature Button */}
                  <button
                    onClick={() => featureMutation.mutate(deal)}
                    disabled={featureMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                  >
                    <Star className="h-3 w-3" />
                    Feature this deal
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block divide-y divide-gray-800">
              {stats.bestDeals.map((deal) => (
                <div
                  key={deal.capCode}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-gray-800/30 transition-colors"
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {deal.rank <= 3 ? (
                      <div
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm",
                          deal.rank === 1 && "bg-amber-500/20 text-amber-400",
                          deal.rank === 2 && "bg-gray-400/20 text-gray-300",
                          deal.rank === 3 && "bg-orange-500/20 text-orange-400"
                        )}
                      >
                        {deal.rank}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm">{deal.rank}</span>
                    )}
                  </div>

                  {/* Vehicle Image */}
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt=""
                      className="w-16 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-10 bg-gray-800 rounded flex items-center justify-center">
                      <Car className="h-5 w-5 text-gray-600" />
                    </div>
                  )}

                  {/* Vehicle Info - VARIANT PROMINENT */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">{deal.manufacturer}</div>
                    <div className="font-medium text-white truncate">
                      {deal.displayName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {deal.fuelType && (
                        <span className="flex items-center gap-1">
                          {deal.fuelType === "Electric" ? (
                            <Zap className="h-3 w-3 text-green-400" />
                          ) : (
                            <Fuel className="h-3 w-3" />
                          )}
                          {deal.fuelType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Provider */}
                  <div className="text-sm text-gray-400 w-28 truncate">
                    {deal.providerName}
                  </div>

                  {/* Price */}
                  <div className="text-right w-24">
                    <div className="font-semibold text-white">
                      £{deal.monthlyPriceGbp}/mo
                    </div>
                    <div className="text-xs text-gray-500">
                      P11D £{deal.p11dGbp.toLocaleString()}
                    </div>
                  </div>

                  {/* Score */}
                  <ScoreBadge score={deal.score} size="md" />

                  {/* Feature Button */}
                  <button
                    onClick={() => featureMutation.mutate(deal)}
                    disabled={featureMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Feature
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No deals found for current filters
          </div>
        )}
      </div>

      {/* Two Column: Import Health + Rate Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Health */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Import Health</h2>
            <Link
              href="/admin/ratesheets"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View all <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.importHealth && stats.importHealth.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {stats.importHealth.map((provider) => (
                <div
                  key={provider.providerCode}
                  className="px-5 py-3 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{provider.providerName}</div>
                    <div className="text-xs text-gray-500">
                      {provider.latestRates.toLocaleString()} rates
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {new Date(provider.lastImport).toLocaleDateString()}
                    </div>
                    {provider.staleImports > 0 && (
                      <div className="text-xs text-amber-400">
                        {provider.staleImports} stale
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    provider.hasIssues
                      ? "bg-red-500/10 text-red-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {provider.hasIssues ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No import data</div>
          )}
        </div>

        {/* Rate Distribution */}
        <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Rate Distribution</h2>
            <Link
              href="/admin/rates"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Explore <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.rateDistribution && stats.rateDistribution.length > 0 ? (
            <div className="p-5 space-y-4">
              {stats.rateDistribution.map((provider) => (
                <div key={provider.providerCode}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{provider.providerName}</span>
                    <span className="text-gray-500">
                      {provider.rateCount.toLocaleString()} rates
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(provider.rateCount / maxRateCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No rate data</div>
          )}
        </div>
      </div>
    </div>
  );
}
