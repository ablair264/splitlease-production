"use client";

import { Suspense } from "react";
import { Search, ClipboardList, Percent, BarChart3 } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const DealFinderContent = dynamic(
  () => import("@/components/admin/deals-unified/DealFinderContent"),
  { loading: () => <TabLoading /> }
);

const OfferQueueContent = dynamic(
  () => import("@/components/admin/deals-unified/OfferQueueContent"),
  { loading: () => <TabLoading /> }
);

const DiscountsContent = dynamic(
  () => import("@/components/admin/deals-unified/DiscountsContent"),
  { loading: () => <TabLoading /> }
);

const PerformanceContent = dynamic(
  () => import("@/components/admin/deals-unified/PerformanceContent"),
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
  { id: "finder", label: "Deal Finder", icon: Search },
  { id: "queue", label: "Offer Queue", icon: ClipboardList },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "performance", label: "Performance", icon: BarChart3 },
];

function DealsContent() {
  const activeTab = useActiveTab("finder");

  return (
    <Tabs tabs={TABS} defaultTab="finder">
      <div className="h-full">
        {activeTab === "finder" && (
          <Suspense fallback={<TabLoading />}>
            <DealFinderContent />
          </Suspense>
        )}
        {activeTab === "queue" && (
          <Suspense fallback={<TabLoading />}>
            <OfferQueueContent />
          </Suspense>
        )}
        {activeTab === "discounts" && (
          <Suspense fallback={<TabLoading />}>
            <DiscountsContent />
          </Suspense>
        )}
        {activeTab === "performance" && (
          <Suspense fallback={<TabLoading />}>
            <PerformanceContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <DealsContent />
    </Suspense>
  );
}
