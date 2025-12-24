"use client";

import { DealCard } from "./DealCard";
import type { DealCard as DealCardType } from "./types";

export function DealCardGrid({
  deals,
  isLoading,
  isError,
  pagination,
  onPageChange,
}: {
  deals: DealCardType[];
  isLoading: boolean;
  isError: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
  onPageChange: (page: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[420px] rounded-2xl border border-gray-800 bg-[#161c24] animate-pulse"
          >
            <div className="h-56 bg-gradient-to-b from-[#9099a5] to-[#f1f4f7]" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-2/3 rounded bg-gray-800" />
              <div className="h-3 w-1/2 rounded bg-gray-800" />
              <div className="h-3 w-1/3 rounded bg-gray-800" />
              <div className="h-4 w-1/2 rounded bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        Failed to load deals. Please try again.
      </div>
    );
  }

  if (!deals.length) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#121821] p-8 text-center text-gray-500">
        No deals found for these filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {deals.map((deal) => (
          <DealCard key={deal.vehicleId} deal={deal} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#121821] px-4 py-3">
          <button
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className="rounded-lg border border-gray-700 bg-[#1a1f2a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition-colors hover:border-[#79d5e9]/50 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className="rounded-lg border border-gray-700 bg-[#1a1f2a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition-colors hover:border-[#79d5e9]/50 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
