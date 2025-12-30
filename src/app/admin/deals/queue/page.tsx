import { Metadata } from "next";
import { OfferQueue } from "@/components/admin/deals";

export const metadata: Metadata = {
  title: "Special Offers Queue | Admin",
  description: "Review and manage special offers queue",
};

export default function SpecialOffersQueuePage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Special Offers Queue</h1>
        <p className="text-white/60 mt-1">
          Review pending deals, approve offers, and discover high-value opportunities
        </p>
      </div>

      {/* Queue Component */}
      <OfferQueue />
    </div>
  );
}
