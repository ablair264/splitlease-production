"use client";

import { Suspense } from "react";
import {
  Search,
  Sparkles,
  ClipboardList,
  BarChart3,
  Sliders,
} from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const RateExplorerContent = dynamic(
  () => import("@/components/admin/pricing/RateExplorerContent"),
  { loading: () => <TabLoading /> }
);

const OfferSuggestionsContent = dynamic(
  () => import("@/components/admin/pricing/OfferSuggestionsContent"),
  { loading: () => <TabLoading /> }
);

const OfferQueueContent = dynamic(
  () => import("@/components/admin/deals-unified/OfferQueueContent"),
  { loading: () => <TabLoading /> }
);

const PerformanceContent = dynamic(
  () => import("@/components/admin/deals-unified/PerformanceContent"),
  { loading: () => <TabLoading /> }
);

const ScoringContent = dynamic(
  () => import("@/components/admin/pricing/ScoringContent"),
  { loading: () => <TabLoading /> }
);

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const TABS = [
  { id: "explorer", label: "Rate Explorer", icon: Search },
  { id: "suggestions", label: "Offer Suggestions", icon: Sparkles },
  { id: "queue", label: "Offer Queue", icon: ClipboardList },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "scoring", label: "Scoring", icon: Sliders },
];

function PricingContent() {
  const activeTab = useActiveTab("explorer");

  return (
    <Tabs tabs={TABS} defaultTab="explorer">
      <div className="h-full">
        {activeTab === "explorer" && (
          <Suspense fallback={<TabLoading />}>
            <RateExplorerContent />
          </Suspense>
        )}
        {activeTab === "suggestions" && (
          <Suspense fallback={<TabLoading />}>
            <OfferSuggestionsContent />
          </Suspense>
        )}
        {activeTab === "queue" && (
          <Suspense fallback={<TabLoading />}>
            <OfferQueueContent />
          </Suspense>
        )}
        {activeTab === "performance" && (
          <Suspense fallback={<TabLoading />}>
            <PerformanceContent />
          </Suspense>
        )}
        {activeTab === "scoring" && (
          <Suspense fallback={<TabLoading />}>
            <ScoringContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <PricingContent />
    </Suspense>
  );
}
