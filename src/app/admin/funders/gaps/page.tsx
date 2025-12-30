import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CoverageGapTable } from "@/components/admin/funders/CoverageGapTable";

export const metadata = {
  title: "Funder Coverage Gaps | Admin",
  description: "Identify vehicles with missing funder coverage",
};

export default async function CoverageGapsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Funder Coverage Gaps</h1>
          <p className="text-white/50 text-sm mt-1">
            Identify vehicles missing coverage from funders to improve rate availability
          </p>
        </div>
      </div>

      {/* Table */}
      <CoverageGapTable />
    </div>
  );
}
