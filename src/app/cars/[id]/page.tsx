import { db, vehicles, vehiclePricing } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Header from "@/components/splitlease/Header";
import Footer from "@/components/splitlease/Footer";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";
import Image from "next/image";
import Link from "next/link";
import {
  Fuel,
  Settings,
  Car,
  Leaf,
  Gauge,
  DoorOpen,
  Shield,
  ChevronLeft,
  Check,
  Phone,
  Mail,
  Mic,
} from "lucide-react";
import VoiceCallButton from "@/components/splitlease/VoiceCallButton";
import EnquiryModal from "@/components/splitlease/EnquiryModal";
import React, { Suspense } from "react";

const colors = {
  dark: "#0f1419",
  mid: "#1a1f2a",
  card: "#1f2633",
  accent: "#79d5e9",
  accentAlt: "#00e7dc",
};

type Props = {
  params: Promise<{ id: string }>;
};

function EnquiryModalLauncher({
  vehicleTitle,
  vehicleImage,
  contractSummary,
}: {
  vehicleTitle: string;
  vehicleImage: string;
  contractSummary: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
      >
        <Mail className="h-4 w-4" />
        Enquire
      </button>
      <EnquiryModal
        open={open}
        onClose={() => setOpen(false)}
        vehicleTitle={vehicleTitle}
        vehicleImage={vehicleImage}
        contractSummary={contractSummary}
      />
    </>
  );
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params;

  // Fetch vehicle details
  const vehicle = await db.query.vehicles.findFirst({
    where: eq(vehicles.id, id),
  });

  if (!vehicle) {
    notFound();
  }

  // Fetch all pricing options for this vehicle
  const pricing = await db
    .select()
    .from(vehiclePricing)
    .where(eq(vehiclePricing.vehicleId, id))
    .orderBy(asc(vehiclePricing.monthlyRental));

  // Group pricing by term
  const pricingByTerm = pricing.reduce((acc, p) => {
    const term = p.term;
    if (!acc[term]) acc[term] = [];
    acc[term].push(p);
    return acc;
  }, {} as Record<number, typeof pricing>);

  // Get the lowest price for display
  const lowestPrice = pricing.length > 0
    ? Math.round(pricing[0].monthlyRental / 100)
    : null;

  // Build image URL
  const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_IMAGE_URL || "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";
  const imageUrl = vehicle.imageFolder
    ? `${R2_BASE_URL}/${vehicle.imageFolder}/front_view.webp`
    : "/images/car-placeholder.webp";

  const vehicleTitle = `${vehicle.manufacturer} ${vehicle.model}`;
  const isNew = vehicle.modelYear === "26" || vehicle.modelYear === "25";
  const contractSummary = pricing[0]
    ? `${pricing[0].term} months • ${pricing[0].annualMileage.toLocaleString()} miles • £${Math.round(pricing[0].monthlyRental / 100)}/mo`
    : "Example contract";

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ backgroundColor: colors.dark, color: "white" }}>
        {/* Breadcrumb */}
        <div className="border-b" style={{ backgroundColor: colors.mid, borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="mx-auto max-w-7xl px-4 py-3">
            <Link
              href="/cars"
              className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to all vehicles
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ backgroundColor: colors.mid }}>
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl" style={{ backgroundColor: colors.card, border: "1px solid rgba(255,255,255,0.06)" }}>
                <Image
                  src={imageUrl}
                  alt={vehicleTitle}
                  fill
                  className="object-cover"
                  priority
                />
                {isNew && (
                  <span className="absolute left-4 top-4 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-sm font-bold uppercase text-white">
                    New
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col">
                <div className="mb-4">
                  <p className="text-sm font-semibold" style={{ color: colors.accent }}>
                    {vehicle.manufacturer}
                  </p>
                  <h1 className="text-3xl font-bold text-white">
                    {vehicle.model}
                  </h1>
                  {vehicle.variant && (
                    <p className="mt-1 text-lg text-white/70">{vehicle.variant}</p>
                  )}
                </div>

                {/* Quick Specs */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {vehicle.fuelType && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <Fuel className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">Fuel</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.fuelType}
                        </p>
                      </div>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <Settings className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">Gearbox</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.transmission}
                        </p>
                      </div>
                    </div>
                  )}
                  {vehicle.bodyStyle && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <Car className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">Body</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.bodyStyle}
                        </p>
                      </div>
                    </div>
                  )}
                  {vehicle.co2 && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <Leaf className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">CO2</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.co2} g/km
                        </p>
                      </div>
                    </div>
                  )}
                  {vehicle.mpg && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <Gauge className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">Economy</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.mpg} mpg
                        </p>
                      </div>
                    </div>
                  )}
                  {vehicle.doors && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3">
                      <DoorOpen className="h-5 w-5" style={{ color: colors.accent }} />
                      <div>
                        <p className="text-xs text-white/60">Doors</p>
                        <p className="text-sm font-medium text-white">
                          {vehicle.doors} door
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price CTA */}
                <div
                  className="mt-auto rounded-xl border p-6"
                  style={{
                    backgroundImage: "linear-gradient(135deg, rgba(0,231,220,0.12), rgba(121,213,233,0.18))",
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: colors.card,
                  }}
                >
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-sm text-white/70">
                        Personal Contract Hire from
                      </p>
                      {lowestPrice ? (
                        <p className="text-4xl font-extrabold" style={{ color: colors.accent }}>
                          £{lowestPrice}
                          <span className="text-lg font-normal text-white/70">
                            /month
                          </span>
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-white">Price on request</p>
                      )}
                    </div>
                    <p className="text-xs text-white/60">
                      +VAT • Based on 36 months
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <VoiceCallButton
                      variant="cta"
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-[#0b1a1f] transition-all"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <EnquiryModalLauncher
                      vehicleTitle={vehicleTitle}
                      vehicleImage={imageUrl}
                      contractSummary={contractSummary}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Table */}
        {pricing.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 py-12">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Lease Pricing Options
            </h2>
            <div className="overflow-hidden rounded-xl border shadow-sm" style={{ backgroundColor: colors.card, borderColor: "rgba(255,255,255,0.1)" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Contract Length
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                        Annual Mileage
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">
                        Monthly Cost
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-white">

                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(pricingByTerm)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([term, termPricing]) =>
                        termPricing.map((p, idx) => (
                          <tr
                            key={p.id}
                            className="transition-colors hover:bg-white/5"
                          >
                            <td className="px-6 py-4">
                              <span className="font-medium text-white">
                                {term} months
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/70">
                              {p.annualMileage.toLocaleString()} miles/year
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-lg font-bold text-white">
                                £{Math.round(p.monthlyRental / 100)}
                              </span>
                              <span className="text-sm text-white/60">/mo</span>
                              <p className="text-xs text-white/50">+VAT</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0b1a1f] transition-colors"
                                style={{ backgroundColor: colors.accent }}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* What's Included */}
        <div style={{ backgroundColor: colors.mid }}>
          <div className="mx-auto max-w-7xl px-4 py-12">
            <h2 className="mb-6 text-2xl font-bold text-white">
              What's Included
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Road Tax for the duration",
                "Manufacturer warranty",
                "Full UK delivery",
                "12 months breakdown cover",
                "No hidden admin fees",
                "Fixed monthly payments",
                "Gap insurance available",
                "Part exchange welcome",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(0,231,220,0.15)" }}
                  >
                    <Check className="h-4 w-4" style={{ color: colors.accent }} />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Technical Specifications
          </h2>
          <div className="overflow-hidden rounded-xl border shadow-sm" style={{ backgroundColor: colors.card, borderColor: "rgba(255,255,255,0.1)" }}>
            <dl className="divide-y divide-white/5">
              {vehicle.manufacturer && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Manufacturer
                  </dt>
                  <dd className="text-sm text-white">{vehicle.manufacturer}</dd>
                </div>
              )}
              {vehicle.model && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">Model</dt>
                  <dd className="text-sm text-white">{vehicle.model}</dd>
                </div>
              )}
              {vehicle.variant && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">Variant</dt>
                  <dd className="text-sm text-white">{vehicle.variant}</dd>
                </div>
              )}
              {vehicle.bodyStyle && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Body Style
                  </dt>
                  <dd className="text-sm text-white">{vehicle.bodyStyle}</dd>
                </div>
              )}
              {vehicle.fuelType && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">Fuel Type</dt>
                  <dd className="text-sm text-white">{vehicle.fuelType}</dd>
                </div>
              )}
              {vehicle.transmission && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Transmission
                  </dt>
                  <dd className="text-sm text-white">{vehicle.transmission}</dd>
                </div>
              )}
              {vehicle.engineSize && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Engine Size
                  </dt>
                  <dd className="text-sm text-white">{vehicle.engineSize}cc</dd>
                </div>
              )}
              {vehicle.doors && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">Doors</dt>
                  <dd className="text-sm text-white">{vehicle.doors}</dd>
                </div>
              )}
              {vehicle.co2 && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    CO2 Emissions
                  </dt>
                  <dd className="text-sm text-white">{vehicle.co2} g/km</dd>
                </div>
              )}
              {vehicle.mpg && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Fuel Economy
                  </dt>
                  <dd className="text-sm text-white">{vehicle.mpg} mpg</dd>
                </div>
              )}
              {vehicle.insuranceGroup && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    Insurance Group
                  </dt>
                  <dd className="text-sm text-white">
                    {vehicle.insuranceGroup}
                  </dd>
                </div>
              )}
              {vehicle.p11d && (
                <div className="grid grid-cols-2 px-6 py-4">
                  <dt className="text-sm font-medium text-white/60">
                    P11D Value
                  </dt>
                  <dd className="text-sm text-white">
                    £{vehicle.p11d.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </main>
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
