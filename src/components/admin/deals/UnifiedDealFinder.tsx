"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Bell,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  ArrowUp,
  ArrowDown,
  Search,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/admin/shared/ScoreBadge";
import { SplitIntelligencePanel } from "@/components/admin/intelligence";
import type {
  IntelligenceData,
  Opportunity,
  Threat,
  Gap,
  PriceAlert,
  FeatureSuggestion,
} from "@/lib/intelligence/types";
import { formatDistanceToNow } from "date-fns";

const CONTRACT_TYPES = [
  { value: "CHNM", label: "Business" },
  { value: "PCHNM", label: "Personal" },
];

// Intelligence query options with 12-hour cache
const INTELLIGENCE_QUERY_OPTIONS = {
  staleTime: 12 * 60 * 60 * 1000, // 12 hours
  gcTime: 24 * 60 * 60 * 1000, // 24 hours (previously cacheTime)
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: false as const,
};

export function UnifiedDealFinder() {
  const [contractType, setContractType] = useState("CHNM");
  const [showChat, setShowChat] = useState(false);

  // Collapsed state for sections
  const [expandedSections, setExpandedSections] = useState({
    opportunities: true,
    threats: true,
    gaps: true,
    priceAlerts: true,
    featureSuggestions: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Fetch intelligence data
  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery<{
    success: boolean;
    data: IntelligenceData;
    error?: string;
  }>({
    queryKey: ["market-intelligence", contractType],
    queryFn: async () => {
      const params = new URLSearchParams({
        contractType,
      });
      const res = await fetch(`/api/admin/intelligence/analysis?${params}`);
      if (!res.ok) throw new Error("Failed to fetch intelligence data");
      return res.json();
    },
    ...INTELLIGENCE_QUERY_OPTIONS,
  });

  const intelligenceData = data?.data;

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!intelligenceData) return null;
    return {
      opportunitiesCount: intelligenceData.opportunities.length,
      threatsCount: intelligenceData.threats.length,
      gapsCount: intelligenceData.gaps.length,
      alertsCount: intelligenceData.priceAlerts.length,
      suggestionsCount: intelligenceData.featureSuggestions.length,
    };
  }, [intelligenceData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Market Intelligence</h1>
          <p className="text-sm text-gray-400">
            Compare our rates to competitor offers and identify opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {dataUpdatedAt && (
            <div className="text-xs text-gray-500">
              Updated {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              showChat
                ? "bg-[#79d5e9] text-[#0f1419]"
                : "bg-[#79d5e9]/15 text-[#79d5e9] border border-[#79d5e9]/30"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            AI Chat
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-[#1a1f2a] rounded-lg border border-gray-800">
        {/* Contract Type */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Contract:</span>
          <div className="flex gap-1">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setContractType(type.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  contractType === type.value
                    ? "bg-cyan-500 text-[#0f1419]"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.opportunitiesCount} opportunities
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <TrendingDown className="h-3.5 w-3.5" />
              {stats.threatsCount} threats
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <Search className="h-3.5 w-3.5" />
              {stats.gapsCount} gaps
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Failed to load intelligence data
          </h3>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      {intelligenceData && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Opportunities & Threats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunities Section */}
            <Section
              title="Opportunities"
              subtitle="Vehicles where we're cheaper than competitors"
              icon={TrendingUp}
              iconColor="text-green-400"
              count={intelligenceData.opportunities.length}
              expanded={expandedSections.opportunities}
              onToggle={() => toggleSection("opportunities")}
            >
              <OpportunitiesGrid opportunities={intelligenceData.opportunities} />
            </Section>

            {/* Threats Section */}
            <Section
              title="Threats"
              subtitle="Competitors are cheaper on these vehicles"
              icon={TrendingDown}
              iconColor="text-red-400"
              count={intelligenceData.threats.length}
              expanded={expandedSections.threats}
              onToggle={() => toggleSection("threats")}
            >
              <ThreatsGrid threats={intelligenceData.threats} />
            </Section>

            {/* Gaps Section */}
            <Section
              title="Market Gaps"
              subtitle="Trending vehicles we don't have rates for"
              icon={Search}
              iconColor="text-blue-400"
              count={intelligenceData.gaps.length}
              expanded={expandedSections.gaps}
              onToggle={() => toggleSection("gaps")}
            >
              <GapsGrid gaps={intelligenceData.gaps} />
            </Section>
          </div>

          {/* Right Column - Alerts, Suggestions, Chat */}
          <div className="space-y-6">
            {/* Feature Suggestions Section */}
            <Section
              title="Feature Suggestions"
              subtitle="Best deals to highlight"
              icon={Sparkles}
              iconColor="text-yellow-400"
              count={intelligenceData.featureSuggestions.length}
              expanded={expandedSections.featureSuggestions}
              onToggle={() => toggleSection("featureSuggestions")}
            >
              <SuggestionsList suggestions={intelligenceData.featureSuggestions} />
            </Section>

            {/* Price Alerts Section */}
            <Section
              title="Price Alerts"
              subtitle="Significant price changes"
              icon={Bell}
              iconColor="text-orange-400"
              count={intelligenceData.priceAlerts.length}
              expanded={expandedSections.priceAlerts}
              onToggle={() => toggleSection("priceAlerts")}
            >
              <AlertsList alerts={intelligenceData.priceAlerts} />
            </Section>
          </div>
        </div>
      )}

      {/* Empty State */}
      {intelligenceData &&
        intelligenceData.opportunities.length === 0 &&
        intelligenceData.threats.length === 0 &&
        intelligenceData.gaps.length === 0 && (
          <div className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-white mb-2">No Intelligence Data</h3>
            <p className="text-gray-400 mb-4">
              No competitor data has been fetched yet. Run a fetch to populate the dashboard.
            </p>
            <button
              onClick={() => fetch("/api/admin/intelligence/fetch", { method: "POST" }).then(() => refetch())}
              className="px-4 py-2 bg-[#79d5e9] text-[#0f1419] rounded-lg font-medium hover:bg-[#79d5e9]/90 transition-colors"
            >
              Fetch Competitor Data
            </button>
          </div>
        )}

      <SplitIntelligencePanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        mode="chat"
      />
    </div>
  );
}

// Section Component
function Section({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              iconColor.replace("text-", "bg-").replace("-400", "-500/20")
            )}
          >
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400 font-normal">
                {count}
              </span>
            </h2>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}

// Opportunities Grid
function OpportunitiesGrid({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No opportunities found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pt-4">
      {opportunities.slice(0, 10).map((opp) => (
        <div
          key={`${opp.manufacturer}-${opp.model}`}
          className="p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {opp.manufacturer} {opp.model}
              </h3>
              <p className="text-xs text-gray-500">
                vs Leasing.com @ £{Math.round(opp.competitorPrice / 100)}/mo
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">
                +{opp.marginPercent.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">cheaper</div>
            </div>
          </div>

          {/* Top 3 Derivatives */}
          <div className="space-y-2">
            {opp.ourTopDerivatives.slice(0, 3).map((deriv, idx) => (
              <div
                key={deriv.capCode || idx}
                className="flex items-center justify-between p-2 bg-gray-900/50 rounded"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {deriv.variant || "Standard"}
                  </div>
                  <div className="text-xs text-gray-600">{deriv.ourProvider}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      £{Math.round(deriv.ourPrice / 100)}/mo
                    </div>
                  </div>
                  <ScoreBadge score={deriv.ourScore} size="sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-500/10 border border-green-500/30 rounded text-green-400 hover:bg-green-500/20 transition-colors">
              <Star className="w-3 h-3 inline mr-1" />
              Feature
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Threats Grid
function ThreatsGrid({ threats }: { threats: Threat[] }) {
  if (threats.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No threats found - we're competitive!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800 pt-4">
      {threats.slice(0, 10).map((threat) => (
        <div
          key={`${threat.manufacturer}-${threat.model}`}
          className="py-3 flex items-center justify-between"
        >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">
              {threat.manufacturer} {threat.model}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>Our best: £{Math.round(threat.ourBestPrice / 100)}/mo</span>
              <span>•</span>
              <span>Competitor: £{Math.round(threat.competitorPrice / 100)}/mo</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                threat.severity === "high"
                  ? "bg-red-500/20 text-red-400"
                  : threat.severity === "medium"
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-yellow-500/20 text-yellow-400"
              )}
            >
              {threat.differencePercent.toFixed(0)}% higher
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Gaps Grid
function GapsGrid({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No gaps found - good coverage!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 pt-4">
      {gaps.slice(0, 8).map((gap) => (
        <div
          key={`${gap.manufacturer}-${gap.model}`}
          className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">
                {gap.manufacturer} {gap.model}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>From £{Math.round(gap.competitorPrice / 100)}/mo</span>
                {gap.dealCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{gap.dealCount} deals</span>
                  </>
                )}
                {gap.trend && gap.trend !== "stable" && (
                  <>
                    <span>•</span>
                    <span className={cn(
                      "flex items-center gap-0.5",
                      gap.trend === "rising" ? "text-green-400" : "text-red-400"
                    )}>
                      {gap.trend === "rising" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {gap.trend}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-colors">
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Suggestions List
function SuggestionsList({ suggestions }: { suggestions: FeatureSuggestion[] }) {
  if (suggestions.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500">
        <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800 pt-4">
      {suggestions.slice(0, 5).map((suggestion) => (
        <div key={suggestion.capCode} className="py-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {suggestion.manufacturer} {suggestion.model}
              </h4>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {suggestion.derivative}
              </p>
              <p className="text-xs text-yellow-400/80 mt-1">{suggestion.reason}</p>
            </div>
            <ScoreBadge score={suggestion.score} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Alerts List
function AlertsList({ alerts }: { alerts: PriceAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500">
        <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No price alerts</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800 pt-4">
      {alerts.slice(0, 5).map((alert, idx) => (
        <div key={idx} className="py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">
              {alert.manufacturer} {alert.model}
            </h4>
            <p className="text-xs text-gray-500">
              £{Math.round(alert.previousPrice / 100)} → £{Math.round(alert.currentPrice / 100)}/mo
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
              alert.changeDirection === "increase"
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            )}
          >
            {alert.changeDirection === "increase" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
            {Math.abs(alert.changePercent).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
