"use client";

import { Suspense } from "react";
import { History, Upload, Link2 } from "lucide-react";
import { Tabs, useActiveTab } from "@/components/admin/shared/Tabs";
import dynamic from "next/dynamic";

const ImportHistoryContent = dynamic(
  () => import("@/components/admin/imports-unified/ImportHistoryContent"),
  { loading: () => <TabLoading /> }
);

const UploadContent = dynamic(
  () => import("@/components/admin/imports-unified/UploadContent"),
  { loading: () => <TabLoading /> }
);

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
  { id: "history", label: "Import History", icon: History },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "matching", label: "CAP Matching", icon: Link2 },
];

function ImportsContent() {
  const activeTab = useActiveTab("history");

  return (
    <Tabs tabs={TABS} defaultTab="history">
      <div className="h-full">
        {activeTab === "history" && (
          <Suspense fallback={<TabLoading />}>
            <ImportHistoryContent />
          </Suspense>
        )}
        {activeTab === "upload" && (
          <Suspense fallback={<TabLoading />}>
            <UploadContent />
          </Suspense>
        )}
        {activeTab === "matching" && (
          <Suspense fallback={<TabLoading />}>
            <MatchingContent />
          </Suspense>
        )}
      </div>
    </Tabs>
  );
}

export default function ImportsPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <ImportsContent />
    </Suspense>
  );
}
