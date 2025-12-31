"use client";

import { Suspense } from "react";
import { Factory, Percent } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const FleetMarqueContent = dynamic(
  () => import("@/components/admin/providers-unified/FleetMarqueContent"),
  { loading: () => <TabLoading /> }
);

const DiscountsContent = dynamic(
  () => import("@/components/admin/deals-unified/DiscountsContent"),
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
  { id: "fleet-marque", label: "Fleet Marque", icon: Factory },
  { id: "discounts", label: "Manufacturer Discounts", icon: Percent },
];

function TermsHoldersContent() {
  const activeTab = useActiveTab("fleet-marque");

  return (
    <Tabs tabs={TABS} defaultTab="fleet-marque">
      <div className="h-full">
        {activeTab === "fleet-marque" && (
          <Suspense fallback={<TabLoading />}>
            <FleetMarqueContent />
          </Suspense>
        )}
        {activeTab === "discounts" && (
          <Suspense fallback={<TabLoading />}>
            <DiscountsContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function TermsHoldersPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <TermsHoldersContent />
    </Suspense>
  );
}
