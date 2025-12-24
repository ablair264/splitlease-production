"use client";

import { cn } from "@/lib/utils";
import { Upload, ChevronRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Import {
  id: string;
  providerCode: string;
  contractType: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  isLatest: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface RecentImportsCardProps {
  imports: Import[];
  isLoading?: boolean;
}

function StatusIcon({ status, hasErrors }: { status: string; hasErrors: boolean }) {
  if (status === "completed" && !hasErrors) {
    return <CheckCircle2 className="w-4 h-4 text-[#4d9869]" />;
  }
  if (status === "completed" && hasErrors) {
    return <AlertCircle className="w-4 h-4 text-[#f8d824]" />;
  }
  if (status === "failed") {
    return <AlertCircle className="w-4 h-4 text-[#dd4444]" />;
  }
  return <Clock className="w-4 h-4 text-gray-400" />;
}

function formatProviderName(code: string): string {
  const names: Record<string, string> = {
    lex: "Lex Autolease",
    ogilvie: "Ogilvie Fleet",
    drivalia: "Drivalia",
    venus: "Venus",
  };
  return names[code.toLowerCase()] || code;
}

export function RecentImportsCard({ imports, isLoading }: RecentImportsCardProps) {
  return (
    <div className="bg-[#161c24] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#79d5e9]" />
          <h3 className="text-base font-semibold text-white">Recent Imports</h3>
        </div>
        <Link
          href="/admin/imports"
          className="text-xs text-[#79d5e9] hover:text-[#4daeac] flex items-center gap-1 transition-colors"
        >
          View History
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-800">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
              <div className="w-4 h-4 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : imports.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">
            No imports found
          </div>
        ) : (
          imports.map((imp) => {
            const hasErrors = imp.errorRows > 0;
            const date = imp.completedAt || imp.createdAt;

            return (
              <div
                key={imp.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {/* Status icon */}
                <StatusIcon status={imp.status} hasErrors={hasErrors} />

                {/* Import info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {formatProviderName(imp.providerCode)} {imp.contractType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(date), { addSuffix: true })} · {imp.successRows.toLocaleString()} rates
                    {hasErrors && (
                      <span className="text-[#f8d824]"> · {imp.errorRows} errors</span>
                    )}
                  </p>
                </div>

                {/* Latest badge */}
                {imp.isLatest && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4d9869]/20 text-[#4d9869] border border-[#4d9869]/30">
                    Latest
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
