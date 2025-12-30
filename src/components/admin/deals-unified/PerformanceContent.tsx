"use client";

import { OfferPerformance } from "@/components/admin/deals";

export default function PerformanceContent() {
  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Offer Performance</h2>
        <p className="text-white/50 text-sm mt-1">
          Track views, enquiries, and conversion rates for featured offers
        </p>
      </div>

      {/* Performance Component */}
      <OfferPerformance />
    </div>
  );
}
