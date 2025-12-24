import { db, leads, vehicles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCarSpecs, type CarSpecs } from "@/lib/cars-api";
import {
  Car,
  Fuel,
  Calendar,
  MapPin,
  Zap,
  Phone,
  Mail,
  Settings,
  Leaf,
  Timer,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import type { GroupedMatchedDeals, VehicleGroupSummary, MatchedDealSummary } from "@/lib/db/schema";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QuotePage({ params }: Props) {
  const { id } = await params;

  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, id),
  });

  if (!lead || !lead.matchedDeals) {
    notFound();
  }

  const groupedDeals = lead.matchedDeals as GroupedMatchedDeals;

  // Check if we have any deals
  const hasPrimaryMatches = groupedDeals.primaryMatches?.length > 0;
  const hasAlternatives = groupedDeals.alternatives?.length > 0;

  if (!hasPrimaryMatches && !hasAlternatives) {
    notFound();
  }

  // Fetch specs for all vehicle groups
  const enrichedPrimaryMatches = await Promise.all(
    (groupedDeals.primaryMatches || []).map(async (group) => {
      let apiSpecs: CarSpecs | null = null;
      try {
        apiSpecs = await getCarSpecs(group.manufacturer, group.model);
      } catch (e) {
        console.error("Failed to fetch API specs:", e);
      }

      // Get full vehicle details for all deals in group
      const dealsWithVehicles = await Promise.all(
        group.deals.map(async (deal) => {
          const vehicle = await db.query.vehicles.findFirst({
            where: eq(vehicles.id, deal.vehicleId),
          });
          return { ...deal, dbSpecs: vehicle };
        })
      );

      return { ...group, deals: dealsWithVehicles, apiSpecs };
    })
  );

  const enrichedAlternatives = await Promise.all(
    (groupedDeals.alternatives || []).map(async (group) => {
      let apiSpecs: CarSpecs | null = null;
      try {
        apiSpecs = await getCarSpecs(group.manufacturer, group.model);
      } catch (e) {
        console.error("Failed to fetch API specs:", e);
      }

      const dealsWithVehicles = await Promise.all(
        group.deals.map(async (deal) => {
          const vehicle = await db.query.vehicles.findFirst({
            where: eq(vehicles.id, deal.vehicleId),
          });
          return { ...deal, dbSpecs: vehicle };
        })
      );

      return { ...group, deals: dealsWithVehicles, apiSpecs };
    })
  );

  const customerName = lead.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SplitFin Auto</h1>
            <p className="text-sm text-slate-400">Vehicle Leasing Specialists</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <a href="tel:01onal234567" className="flex items-center gap-1 hover:text-white">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">01onal 234567</span>
            </a>
            <a href="mailto:info@splitfinauto.co.uk" className="flex items-center gap-1 hover:text-white">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contact Us</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Hi {customerName}, here are your personalised quotes
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Based on your requirements, we&apos;ve selected the best deals from our trusted funder network.
            All prices include road tax and are subject to status.
          </p>
        </div>

        {/* Primary Matches */}
        {hasPrimaryMatches && (
          <section className="mb-16">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Your Matching Vehicles
            </h3>
            <div className="space-y-8">
              {enrichedPrimaryMatches.map((group, groupIndex) => (
                <VehicleGroupCard
                  key={group.groupKey}
                  group={group}
                  isPrimary={true}
                  groupIndex={groupIndex}
                />
              ))}
            </div>
          </section>
        )}

        {/* Alternatives */}
        {hasAlternatives && (
          <section className="mb-16">
            <h3 className="text-xl font-semibold text-white mb-2">You might also like</h3>
            <p className="text-slate-400 text-sm mb-6">
              Similar vehicles in the same class that might interest you
            </p>
            <div className="space-y-8">
              {enrichedAlternatives.map((group, groupIndex) => (
                <VehicleGroupCard
                  key={group.groupKey}
                  group={group}
                  isPrimary={false}
                  groupIndex={groupIndex}
                />
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-2">Ready to proceed?</h3>
            <p className="text-slate-400 mb-6">
              Give us a call or reply to your email and we&apos;ll get your application started.
              Most approvals take just 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:01234567890"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Call Us Now
              </a>
              <a
                href="mailto:info@splitfinauto.co.uk"
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Email Us
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>
            SplitFin Auto is authorised and regulated by the Financial Conduct Authority.
            FCA Reference: 123456. Prices shown are for personal contract hire and exclude VAT.
          </p>
          <p className="mt-2">
            Quote reference: {id.slice(0, 8).toUpperCase()} | Generated {new Date().toLocaleDateString("en-GB")}
          </p>
        </footer>
      </div>
    </div>
  );
}

function VehicleGroupCard({
  group,
  isPrimary,
  groupIndex,
}: {
  group: any;
  isPrimary: boolean;
  groupIndex: number;
}) {
  const apiSpecs = group.apiSpecs;
  const isTopPick = isPrimary && groupIndex === 0;
  const cheapestDeal = group.deals[0];
  const hasMultipleOptions = group.deals.length > 1;

  // Get value rating for the group
  const getValueRating = (score: number) => {
    if (score >= 85) return { grade: "A", label: "Exceptional Value", color: "emerald" };
    if (score >= 70) return { grade: "B", label: "Great Value", color: "green" };
    if (score >= 55) return { grade: "C", label: "Good Value", color: "yellow" };
    if (score >= 40) return { grade: "D", label: "Fair Value", color: "orange" };
    return { grade: "E", label: "Standard", color: "slate" };
  };

  const valueRating = getValueRating(group.bestScore);

  return (
    <div
      className={`bg-slate-800/50 border rounded-2xl overflow-hidden ${
        isTopPick ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-slate-700"
      }`}
    >
      {/* Group Header */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Value Rating Badge */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0
            ${valueRating.color === "emerald" ? "bg-emerald-500 text-white" : ""}
            ${valueRating.color === "green" ? "bg-green-500 text-white" : ""}
            ${valueRating.color === "yellow" ? "bg-yellow-500 text-slate-900" : ""}
            ${valueRating.color === "orange" ? "bg-orange-500 text-white" : ""}
            ${valueRating.color === "slate" ? "bg-slate-600 text-white" : ""}
          `}
          >
            {valueRating.grade}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xl font-semibold text-white">
                {group.manufacturer} {group.model}
              </h4>
              {isTopPick && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  BEST MATCH
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {group.deals.length} option{group.deals.length > 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-slate-400 text-sm">From</p>
          <p className="text-2xl font-bold text-white">
            £{cheapestDeal.monthlyRental.toFixed(2)}
            <span className="text-slate-400 text-base font-normal">/mo</span>
          </p>
          <p className="text-sm text-slate-500">+VAT</p>
        </div>
      </div>

      {/* Specs Row */}
      <div className="px-6 pb-4 flex flex-wrap gap-4 text-sm text-slate-300">
        {apiSpecs?.engineHp && (
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>{apiSpecs.engineHp}</span>
          </div>
        )}
        {apiSpecs?.acceleration0To100KmPerHS && (
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-rose-400" />
            <span>0-62: {apiSpecs.acceleration0To100KmPerHS}</span>
          </div>
        )}
        {(apiSpecs?.fuelGrade || group.fuelType) && (
          <div className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4 text-blue-400" />
            <span>{apiSpecs?.fuelGrade || group.fuelType}</span>
          </div>
        )}
        {(apiSpecs?.numberOfGears || group.transmission) && (
          <div className="flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-purple-400" />
            <span>{apiSpecs?.numberOfGears || group.transmission}</span>
          </div>
        )}
        {group.avgCo2 && (
          <div className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-green-400" />
            <span>{group.avgCo2} g/km CO2</span>
          </div>
        )}
        {group.avgP11d && (
          <div className="flex items-center gap-1.5">
            <Car className="h-4 w-4 text-slate-400" />
            <span>~£{group.avgP11d.toLocaleString()} list</span>
          </div>
        )}
      </div>

      {/* Pricing Options Table */}
      <div className="border-t border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr className="text-left text-sm text-slate-400">
                <th className="px-6 py-3 font-medium">Variant</th>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Mileage</th>
                <th className="px-4 py-3 font-medium text-right">Monthly</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {group.deals.slice(0, 5).map((deal: any, dealIndex: number) => (
                <DealRow key={deal.vehicleId + dealIndex} deal={deal} isFirst={dealIndex === 0} />
              ))}
            </tbody>
          </table>
        </div>

        {group.deals.length > 5 && (
          <div className="px-6 py-3 text-center border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              +{group.deals.length - 5} more option{group.deals.length - 5 > 1 ? "s" : ""} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DealRow({ deal, isFirst }: { deal: any; isFirst: boolean }) {
  const dbSpecs = deal.dbSpecs;

  return (
    <tr className={`border-t border-slate-700/50 ${isFirst ? "bg-emerald-500/5" : "hover:bg-slate-700/30"}`}>
      <td className="px-6 py-4 min-w-[250px]">
        <p className="text-white text-sm font-medium" title={deal.variant}>
          {deal.variant || "Standard"}
        </p>
        {dbSpecs?.fuelType && (
          <p className="text-xs text-slate-500">{dbSpecs.fuelType}</p>
        )}
      </td>
      <td className="px-4 py-4">
        <p className="text-slate-300 text-sm">{deal.term} months</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-slate-300 text-sm">{deal.annualMileage.toLocaleString()}/yr</p>
      </td>
      <td className="px-4 py-4 text-right">
        <p className="text-white font-semibold">£{deal.monthlyRental.toFixed(2)}</p>
        <p className="text-xs text-slate-500">+VAT</p>
      </td>
      <td className="px-6 py-4">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isFirst
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-slate-700 hover:bg-slate-600 text-white"
          }`}
        >
          Select
        </button>
      </td>
    </tr>
  );
}
