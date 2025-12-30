"use client";

import { DiscountTable } from "@/components/admin/discounts/DiscountTable";

export default function DiscountsContent() {
  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Manufacturer Discounts</h2>
        <p className="text-white/50 text-sm mt-1">
          Fleet marque discount terms scraped from manufacturer sites
        </p>
      </div>

      {/* Table */}
      <DiscountTable />
    </div>
  );
}
