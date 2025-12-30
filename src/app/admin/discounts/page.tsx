import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiscountTable } from "@/components/admin/discounts/DiscountTable";

export const metadata = {
  title: "Manufacturer Discounts | Admin",
  description: "View manufacturer fleet discount terms",
};

export default async function DiscountsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manufacturer Discounts</h1>
          <p className="text-white/50 text-sm mt-1">
            Fleet marque discount terms scraped from manufacturer sites
          </p>
        </div>
      </div>

      {/* Table */}
      <DiscountTable />
    </div>
  );
}
