"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Search,
  Sparkles,
  Trash2,
  Car,
  Zap,
  Fuel,
  Clock,
  RefreshCw,
  X,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";
import { SplitIntelligencePanel } from "@/components/admin/intelligence";

interface FeaturedDeal {
  id: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string | null;
  displayName: string;
  fuelType: string | null;
  featuredPriceGbp: number | null;
  featuredScore: number | null;
  featuredProvider: string | null;
  currentPriceGbp: number | null;
  currentScore: number | null;
  currentProvider: string | null;
  daysFeatured: number;
  featuredAt: string;
}

interface Candidate {
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
  score: number;
  scoreLabel: string;
  imageUrl: string | null;
}

interface FeaturedResponse {
  tab: string;
  deals: FeaturedDeal[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface CandidatesResponse {
  tab: string;
  deals: Candidate[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  appliedFilters: {
    contractType: string;
    term: number;
    mileage: number;
    scoreMin: number;
  };
}

const CONTRACT_TYPES = [
  { value: "CHNM", label: "CH (No Maint)" },
  { value: "CH", label: "CH (Maint)" },
  { value: "PCHNM", label: "PCH (No Maint)" },
  { value: "PCH", label: "PCH (Maint)" },
];

const TABS = [
  { value: "featured", label: "Featured", icon: Star },
  { value: "candidates", label: "Candidates", icon: Sparkles },
];

export function DealFinder() {
  const [activeTab, setActiveTab] = useState<"featured" | "candidates">("featured");
  const [contractType, setContractType] = useState("CHNM");
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);
  const [scoreMin, setScoreMin] = useState(80);
  const [page, setPage] = useState(1);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const queryClient = useQueryClient();

  // Featured deals query
  const featuredQuery = useQuery<FeaturedResponse>({
    queryKey: ["featured-deals", contractType, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: "featured",
        contractType,
        page: page.toString(),
        pageSize: "20",
      });
      const res = await fetch(`/api/admin/deals/featured?${params}`);
      if (!res.ok) throw new Error("Failed to fetch featured deals");
      return res.json();
    },
    enabled: activeTab === "featured",
  });

  // Candidates query
  const candidatesQuery = useQuery<CandidatesResponse>({
    queryKey: ["deal-candidates", contractType, term, mileage, scoreMin, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        tab: "candidates",
        contractType,
        term: term.toString(),
        mileage: mileage.toString(),
        scoreMin: scoreMin.toString(),
        page: page.toString(),
        pageSize: "20",
      });
      const res = await fetch(`/api/admin/deals/featured?${params}`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return res.json();
    },
    enabled: activeTab === "candidates",
  });

  // Feature mutation
  const featureMutation = useMutation({
    mutationFn: async (candidate: Candidate) => {
      const res = await fetch("/api/admin/deals/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capCode: candidate.capCode,
          manufacturer: candidate.manufacturer,
          model: candidate.model,
          variant: candidate.variant,
          fuelType: candidate.fuelType,
          providerCode: candidate.providerCode,
          monthlyPrice: candidate.monthlyPriceGbp,
          term,
          mileage,
          contractType,
          score: candidate.score,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to feature deal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-candidates"] });
    },
  });

  // Unfeature mutation
  const unfeatureMutation = useMutation({
    mutationFn: async (id: string) => {
      const params = new URLSearchParams({ id, contractType });
      const res = await fetch(`/api/admin/deals/featured?${params}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unfeature deal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-candidates"] });
    },
  });

  const currentQuery = activeTab === "featured" ? featuredQuery : candidatesQuery;
  const pagination = currentQuery.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Featured Deals</h1>
          <p className="text-sm text-gray-400">
            Manage deals featured on the website
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* SplitIntelligence Button */}
          <button
            onClick={() => setShowIntelligence(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(121, 213, 233, 0.15)",
              color: "#79d5e9",
              border: "1px solid rgba(121, 213, 233, 0.3)",
            }}
          >
            <BarChart3 className="w-4 h-4" />
            SplitIntelligence
          </button>

          {/* Contract Type Toggle */}
          <div className="flex items-center gap-2 bg-[#121821] rounded-xl p-1 border border-gray-800">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setContractType(type.value);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
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
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value as "featured" | "candidates");
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.value === "featured" && featuredQuery.data?.pagination?.total !== undefined && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400">
                  {featuredQuery.data.pagination.total}
                </span>
              )}
              {tab.value === "candidates" && candidatesQuery.data?.pagination?.total !== undefined && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-xs text-emerald-400">
                  {candidatesQuery.data.pagination.total}
                </span>
              )}
            </button>
          );
        })}

        {/* Refresh Button */}
        <button
          onClick={() => currentQuery.refetch()}
          disabled={currentQuery.isFetching}
          className="ml-auto p-2 text-gray-500 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", currentQuery.isFetching && "animate-spin")} />
        </button>
      </div>

      {/* Candidates Filters */}
      {activeTab === "candidates" && (
        <div className="flex items-center gap-4 p-4 bg-[#1a1f2a] rounded-lg border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Term:</span>
            <div className="flex gap-1">
              {[24, 36, 48, 60].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTerm(t);
                    setPage(1);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    term === t
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-white"
                  )}
                >
                  {t}mo
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Mileage:</span>
            <div className="flex gap-1">
              {[5000, 8000, 10000, 15000].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMileage(m);
                    setPage(1);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    mileage === m
                      ? "bg-gray-700 text-white"
                      : "text-gray-500 hover:text-white"
                  )}
                >
                  {m / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Min Score:</span>
            <select
              value={scoreMin}
              onChange={(e) => {
                setScoreMin(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white"
            >
              <option value={65}>65+ (Great)</option>
              <option value={80}>80+ (Hot)</option>
              <option value={85}>85+ (Very Hot)</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {currentQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : currentQuery.isError ? (
        <div className="p-8 text-center text-red-400">
          Failed to load deals. Please try again.
        </div>
      ) : activeTab === "featured" ? (
        /* Featured Deals List */
        <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
          {featuredQuery.data?.deals && featuredQuery.data.deals.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {featuredQuery.data.deals.map((deal) => (
                <div
                  key={deal.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-gray-800/30 transition-colors"
                >
                  {/* Vehicle Image Placeholder */}
                  <div className="w-16 h-10 bg-gray-800 rounded flex items-center justify-center">
                    <Car className="h-5 w-5 text-gray-600" />
                  </div>

                  {/* Vehicle Info - VARIANT PROMINENT */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-0.5">
                      {deal.manufacturer}
                    </div>
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

                  {/* Featured Info */}
                  <div className="text-center w-28">
                    <div className="text-sm font-medium text-white">
                      £{deal.featuredPriceGbp || deal.currentPriceGbp}/mo
                    </div>
                    <div className="text-xs text-gray-500">
                      via {deal.featuredProvider || deal.currentProvider}
                    </div>
                  </div>

                  {/* Current Score */}
                  {deal.currentScore && (
                    <ScoreBadge score={deal.currentScore} size="sm" />
                  )}

                  {/* Days Featured */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 w-24">
                    <Clock className="h-3.5 w-3.5" />
                    {deal.daysFeatured} days
                  </div>

                  {/* Unfeature Button */}
                  <button
                    onClick={() => unfeatureMutation.mutate(deal.id)}
                    disabled={unfeatureMutation.isPending}
                    className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove from featured"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No featured deals</p>
              <p className="text-sm mt-1">
                Switch to Candidates tab to find deals to feature
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Candidates List */
        <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
          {candidatesQuery.data?.deals && candidatesQuery.data.deals.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {candidatesQuery.data.deals.map((candidate) => (
                <div
                  key={candidate.capCode}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-gray-800/30 transition-colors"
                >
                  {/* Vehicle Image */}
                  {candidate.imageUrl ? (
                    <img
                      src={candidate.imageUrl}
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
                    <div className="text-xs text-gray-500 mb-0.5">
                      {candidate.manufacturer}
                    </div>
                    <div className="font-medium text-white truncate">
                      {candidate.displayName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      {candidate.fuelType && (
                        <span className="flex items-center gap-1">
                          {candidate.fuelType === "Electric" ? (
                            <Zap className="h-3 w-3 text-green-400" />
                          ) : (
                            <Fuel className="h-3 w-3" />
                          )}
                          {candidate.fuelType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Provider */}
                  <div className="text-sm text-gray-400 w-28 truncate">
                    {candidate.providerName}
                  </div>

                  {/* Price */}
                  <div className="text-right w-24">
                    <div className="font-semibold text-white">
                      £{candidate.monthlyPriceGbp}/mo
                    </div>
                    <div className="text-xs text-gray-500">
                      P11D £{candidate.p11dGbp.toLocaleString()}
                    </div>
                  </div>

                  {/* Score */}
                  <ScoreBadge score={candidate.score} size="md" />

                  {/* Feature Button */}
                  <button
                    onClick={() => featureMutation.mutate(candidate)}
                    disabled={featureMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Feature
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No candidates found</p>
              <p className="text-sm mt-1">
                Try lowering the minimum score threshold
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {(page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* SplitIntelligence Panel */}
      <SplitIntelligencePanel
        isOpen={showIntelligence}
        onClose={() => setShowIntelligence(false)}
      />
    </div>
  );
}
