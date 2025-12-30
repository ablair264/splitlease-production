"use client";

import { CoverageGapTable, RateRequestExport } from "@/components/admin/funders";

export default function CoverageGapsContent() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Funder Coverage Gaps</h2>
          <p className="text-white/50 text-sm mt-1">
            Identify vehicles missing coverage from funders to improve rate availability
          </p>
        </div>
      </div>

      {/* Rate Request Export */}
      <RateRequestExport />

      {/* Coverage Gap Table */}
      <CoverageGapTable />
    </div>
  );
}
