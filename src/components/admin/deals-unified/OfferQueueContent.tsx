"use client";

import { OfferQueue } from "@/components/admin/deals";

export default function OfferQueueContent() {
  return (
    <div className="p-6 overflow-auto h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Offer Queue</h2>
        <p className="text-white/50 text-sm mt-1">
          Review pending deals, approve offers, and discover high-value opportunities
        </p>
      </div>

      {/* Queue Component */}
      <OfferQueue />
    </div>
  );
}
