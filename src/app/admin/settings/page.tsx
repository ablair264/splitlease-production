"use client";

import { Suspense } from "react";
import { Link2, Settings } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const MatchingContent = dynamic(
  () => import("@/components/admin/imports-unified/MatchingContent"),
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
  { id: "matching", label: "CAP Matching", icon: Link2 },
];

function SettingsContent() {
  const activeTab = useActiveTab("matching");

  return (
    <Tabs tabs={TABS} defaultTab="matching">
      <div className="h-full">
        {activeTab === "matching" && (
          <Suspense fallback={<TabLoading />}>
            <MatchingContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
