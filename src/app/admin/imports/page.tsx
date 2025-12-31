"use client";

import { Suspense } from "react";
import { History } from "lucide-react";
import dynamic from "next/dynamic";

const ImportHistoryContent = dynamic(
  () => import("@/components/admin/imports-unified/ImportHistoryContent"),
  { loading: () => <TabLoading /> }
);

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ImportsPage() {
  return (
    <Suspense fallback={<TabLoading />}>
      <ImportHistoryContent />
    </Suspense>
  );
}
