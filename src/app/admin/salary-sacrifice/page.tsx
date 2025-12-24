"use client";

import { useQuery } from "@tanstack/react-query";
import { Calculator, Zap, TrendingUp, Building2 } from "lucide-react";
import { VehicleDisplay } from "@/components/admin/shared/VehicleDisplay";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";

interface DashboardStats {
  totalRates: number;
  evRates: number;
  providers: number;
  averageBik: number;
  topDeals: Array<{
    id: string;
    manufacturer: string;
    model: string;
    variant: string | null;
    providerCode: string;
    grossDeductionFormatted: string;
    bikPercentFormatted: string;
    bikTaxMonthly: string | null;
    score: number;
    isZeroEmission: boolean;
  }>;
}

export default function SalarySacrificeDashboard() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["ss-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/salary-sacrifice/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Salary Sacrifice Dashboard
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          BSSNL rates with BIK analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Calculator}
          label="Total SS Rates"
          value={data?.totalRates?.toLocaleString() || "—"}
          isLoading={isLoading}
        />
        <MetricCard
          icon={Zap}
          label="Zero Emission (0% BIK)"
          value={data?.evRates?.toLocaleString() || "—"}
          highlight
          isLoading={isLoading}
        />
        <MetricCard
          icon={Building2}
          label="Providers"
          value={data?.providers?.toString() || "—"}
          isLoading={isLoading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg BIK %"
          value={data?.averageBik ? `${data.averageBik.toFixed(1)}%` : "—"}
          isLoading={isLoading}
        />
      </div>

      {/* Top EV Deals */}
      <div className="bg-[#1a1f2a] rounded-xl border border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          Top Zero-Emission Deals
        </h2>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
            ))
          ) : data?.topDeals?.length ? (
            data.topDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <ScoreBadge score={deal.score} size="md" />
                  <VehicleDisplay
                    variant={deal.variant}
                    manufacturer={deal.manufacturer}
                    model={deal.model}
                    size="sm"
                  />
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    £{deal.grossDeductionFormatted}/mo
                  </div>
                  <div className="text-xs text-gray-400">
                    BIK: {deal.bikPercentFormatted}%
                    {deal.bikTaxMonthly && ` • Tax: £${deal.bikTaxMonthly}`}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No zero-emission deals found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-[#1a1f2a] border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon className={`h-4 w-4 ${highlight ? "text-emerald-400" : ""}`} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
      ) : (
        <div className={`text-2xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>
          {value}
        </div>
      )}
    </div>
  );
}
