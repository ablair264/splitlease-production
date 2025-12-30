"use client";

import { Suspense } from "react";
import { AlertCircle, BarChart3, FileOutput } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const CoverageGapsContent = dynamic(
  () => import("@/components/admin/funders-unified/CoverageGapsContent"),
  { loading: () => <TabLoading /> }
);

const PerformanceContent = dynamic(
  () => import("@/components/admin/funders-unified/PerformanceContent"),
  { loading: () => <TabLoading /> }
);

const RateRequestContent = dynamic(
  () => import("@/components/admin/funders-unified/RateRequestContent"),
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
  { id: "gaps", label: "Coverage Gaps", icon: AlertCircle },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "requests", label: "Rate Requests", icon: FileOutput },
];

function FundersContent() {
  const activeTab = useActiveTab("gaps");

  return (
    <Tabs tabs={TABS} defaultTab="gaps">
      <div className="h-full">
        {activeTab === "gaps" && (
          <Suspense fallback={<TabLoading />}>
            <CoverageGapsContent />
          </Suspense>
        )}
        {activeTab === "performance" && (
          <Suspense fallback={<TabLoading />}>
            <PerformanceContent />
          </Suspense>
        )}
        {activeTab === "requests" && (
          <Suspense fallback={<TabLoading />}>
            <RateRequestContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function FundersPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <FundersContent />
    </Suspense>
  );
}
