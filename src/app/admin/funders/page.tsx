"use client";

import { Suspense } from "react";
import { BarChart3, Car, Building2, Truck, FileOutput } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const PerformanceContent = dynamic(
  () => import("@/components/admin/funders-unified/PerformanceContent"),
  { loading: () => <TabLoading /> }
);

const LexContent = dynamic(
  () => import("@/components/admin/providers-unified/LexContent"),
  { loading: () => <TabLoading /> }
);

const OgilvieContent = dynamic(
  () => import("@/components/admin/providers-unified/OgilvieContent"),
  { loading: () => <TabLoading /> }
);

const DrivaliaContent = dynamic(
  () => import("@/components/admin/providers-unified/DrivaliaContent"),
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
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "lex", label: "Lex Autolease", icon: Car },
  { id: "ogilvie", label: "Ogilvie Fleet", icon: Building2 },
  { id: "drivalia", label: "Drivalia", icon: Truck },
  { id: "requests", label: "Rate Requests", icon: FileOutput },
];

function FundersContent() {
  const activeTab = useActiveTab("dashboard");

  return (
    <Tabs tabs={TABS} defaultTab="dashboard">
      <div className="h-full">
        {activeTab === "dashboard" && (
          <Suspense fallback={<TabLoading />}>
            <PerformanceContent />
          </Suspense>
        )}
        {activeTab === "lex" && (
          <Suspense fallback={<TabLoading />}>
            <LexContent />
          </Suspense>
        )}
        {activeTab === "ogilvie" && (
          <Suspense fallback={<TabLoading />}>
            <OgilvieContent />
          </Suspense>
        )}
        {activeTab === "drivalia" && (
          <Suspense fallback={<TabLoading />}>
            <DrivaliaContent />
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
