"use client";

import { Suspense } from "react";
import { Car, Building2, Factory, Truck } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const LexContent = dynamic(
  () => import("@/components/admin/providers-unified/LexContent"),
  { loading: () => <TabLoading /> }
);

const OgilvieContent = dynamic(
  () => import("@/components/admin/providers-unified/OgilvieContent"),
  { loading: () => <TabLoading /> }
);

const FleetMarqueContent = dynamic(
  () => import("@/components/admin/providers-unified/FleetMarqueContent"),
  { loading: () => <TabLoading /> }
);

const DrivaliaContent = dynamic(
  () => import("@/components/admin/providers-unified/DrivaliaContent"),
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
  { id: "lex", label: "Lex Autolease", icon: Car },
  { id: "ogilvie", label: "Ogilvie Fleet", icon: Building2 },
  { id: "fleet-marque", label: "Fleet Marque", icon: Factory },
  { id: "drivalia", label: "Drivalia", icon: Truck },
];

function ProvidersContent() {
  const activeTab = useActiveTab("lex");

  return (
    <Tabs tabs={TABS} defaultTab="lex">
      <div className="h-full">
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
        {activeTab === "fleet-marque" && (
          <Suspense fallback={<TabLoading />}>
            <FleetMarqueContent />
          </Suspense>
        )}
        {activeTab === "drivalia" && (
          <Suspense fallback={<TabLoading />}>
            <DrivaliaContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <ProvidersContent />
    </Suspense>
  );
}
