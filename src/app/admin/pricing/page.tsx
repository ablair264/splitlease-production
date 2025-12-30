"use client";

import { Suspense } from "react";
import {
  Search,
  TrendingUp,
  AlertTriangle,
  Sliders,
} from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";

// Lazy load tab content components
import dynamic from "next/dynamic";

const RateExplorerContent = dynamic(
  () => import("@/components/admin/pricing/RateExplorerContent"),
  { loading: () => <TabLoading /> }
);

const MarketPositionContent = dynamic(
  () => import("@/components/admin/pricing/MarketPositionContent"),
  { loading: () => <TabLoading /> }
);

const PriceAlertsContent = dynamic(
  () => import("@/components/admin/pricing/PriceAlertsContent"),
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
  { id: "market", label: "Market Position", icon: TrendingUp },
  { id: "alerts", label: "Price Alerts", icon: AlertTriangle },
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
        {activeTab === "market" && (
          <Suspense fallback={<TabLoading />}>
            <MarketPositionContent />
          </Suspense>
        )}
        {activeTab === "alerts" && (
          <Suspense fallback={<TabLoading />}>
            <PriceAlertsContent />
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
