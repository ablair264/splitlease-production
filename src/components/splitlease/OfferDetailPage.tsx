"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Phone,
  Calculator,
  Building2,
  User,
  ChevronDown,
  Check,
  Zap,
  Leaf,
  Fuel,
  Gauge,
  Settings,
  Users,
  Car,
  Battery,
  Info,
  FileText,
  Wrench,
  Shield,
} from "lucide-react";
import { Vehicle } from "./VehicleCard";

// Color scheme
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
};

// R2 image base URL
const R2_BASE_URL = "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";

const IMAGE_VIEWS = [
  { key: "front_view", label: "Front" },
  { key: "rear_view", label: "Rear" },
  { key: "side_view", label: "Side" },
  { key: "interior_view", label: "Interior" },
  { key: "dashboard_view", label: "Dashboard" },
];

// Calculator options
const MILEAGE_OPTIONS = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
const TERM_OPTIONS = [24, 36, 48];
const UPFRONT_OPTIONS = [1, 3, 6, 9, 12];

// Tab types
type TabId = "deal" | "specs" | "features";

// Sample vehicles for demo (in production, fetch from API/database)
const sampleVehicles: Vehicle[] = [
  { id: "1", manufacturer: "Tesla", model: "Model 3", derivative: "Long Range AWD", fuelType: "Electric", bodyType: "Saloon", transmission: "Automatic", electricRange: 374, doors: 4, seats: 5, imageFolder: "tesla-model-3", isNew: true, isSpecialOffer: true, baseMonthlyPrice: 449 },
  { id: "2", manufacturer: "BMW", model: "X3", derivative: "xDrive30e M Sport", fuelType: "Plug-in Hybrid", bodyType: "SUV", transmission: "Automatic", mpg: 141.2, co2: 46, doors: 5, seats: 5, imageFolder: "bmw-x3", quickDelivery: true, baseMonthlyPrice: 549 },
  { id: "3", manufacturer: "Audi", model: "A3", derivative: "35 TFSI S Line", fuelType: "Petrol", bodyType: "Hatchback", transmission: "Automatic", mpg: 47.9, co2: 134, doors: 5, seats: 5, imageFolder: "audi-a3", isSpecialOffer: true, baseMonthlyPrice: 329 },
  { id: "4", manufacturer: "Mercedes-Benz", model: "GLC", derivative: "300e AMG Line Premium", fuelType: "Plug-in Hybrid", bodyType: "SUV", transmission: "Automatic", mpg: 256.8, co2: 25, electricRange: 75, doors: 5, seats: 5, imageFolder: "mercedes-glc", isNew: true, quickDelivery: true, baseMonthlyPrice: 629 },
  { id: "5", manufacturer: "Volkswagen", model: "ID.4", derivative: "Life Pro Performance", fuelType: "Electric", bodyType: "SUV", transmission: "Automatic", electricRange: 322, doors: 5, seats: 5, imageFolder: "vw-id4", isSpecialOffer: true, baseMonthlyPrice: 399 },
  { id: "6", manufacturer: "Hyundai", model: "Tucson", derivative: "1.6 T-GDi Premium", fuelType: "Hybrid", bodyType: "SUV", transmission: "Automatic", mpg: 49.6, co2: 131, doors: 5, seats: 5, imageFolder: "hyundai-tucson", isSpecialOffer: true, quickDelivery: true, baseMonthlyPrice: 349 },
  { id: "7", manufacturer: "Peugeot", model: "3008", derivative: "GT Hybrid", fuelType: "Plug-in Hybrid", bodyType: "SUV", transmission: "Automatic", mpg: 235.4, co2: 29, electricRange: 60, doors: 5, seats: 5, imageFolder: "peugeot-3008", isNew: true, isSpecialOffer: true, baseMonthlyPrice: 379 },
  { id: "8", manufacturer: "Ford", model: "Mustang Mach-E", derivative: "Extended Range RWD", fuelType: "Electric", bodyType: "SUV", transmission: "Automatic", electricRange: 379, doors: 5, seats: 5, imageFolder: "ford-mach-e", isSpecialOffer: true, baseMonthlyPrice: 479 },
  { id: "v1", manufacturer: "Ford", model: "Transit", derivative: "350 L3H2 Leader", fuelType: "Diesel", bodyType: "Large Van", transmission: "Manual", mpg: 34.0, doors: 4, imageFolder: "ford-transit", quickDelivery: true, baseMonthlyPrice: 349 },
  { id: "v2", manufacturer: "Mercedes-Benz", model: "Sprinter", derivative: "314 CDI L2H2", fuelType: "Diesel", bodyType: "Large Van", transmission: "Automatic", mpg: 32.8, doors: 4, imageFolder: "mercedes-sprinter", baseMonthlyPrice: 399 },
  { id: "v3", manufacturer: "Volkswagen", model: "Crafter", derivative: "2.0 TDI CR35 MWB", fuelType: "Diesel", bodyType: "Large Van", transmission: "Manual", mpg: 35.3, doors: 4, imageFolder: "vw-crafter", isSpecialOffer: true, baseMonthlyPrice: 379 },
  { id: "v4", manufacturer: "Ford", model: "Transit Custom", derivative: "300 EcoBlue Limited", fuelType: "Diesel", bodyType: "Medium Van", transmission: "Manual", mpg: 40.4, doors: 4, imageFolder: "ford-transit-custom", isSpecialOffer: true, quickDelivery: true, baseMonthlyPrice: 299 },
];

interface OfferDetailPageProps {
  vehicleId?: string;
  vehicleType?: "car" | "van";
  vehicle?: Vehicle;
  technicalSpecs?: Record<string, Record<string, string>>;
  features?: Record<string, string[]>;
}

export default function OfferDetailPage({
  vehicleId,
  vehicleType = "car",
  vehicle: vehicleProp,
  technicalSpecs = {},
  features = {},
}: OfferDetailPageProps) {
  // Find vehicle from ID or use provided vehicle, fallback to first sample
  const vehicle = vehicleProp || sampleVehicles.find(v => v.id === vehicleId) || sampleVehicles[0];
  const basePath = vehicleType === "van" ? "/vans" : "/cars";
  // Gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Calculator state
  const [mileage, setMileage] = useState(10000);
  const [term, setTerm] = useState(36);
  const [upfront, setUpfront] = useState(3);
  const [isBusiness, setIsBusiness] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("deal");
  const [expandedSpecs, setExpandedSpecs] = useState<Set<string>>(new Set(["Performance"]));
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set(["Safety"]));
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Generate image URLs
  const imageUrls = useMemo(() => {
    if (!vehicle.imageFolder) {
      return IMAGE_VIEWS.map(() => "/images/car-placeholder.webp");
    }
    return IMAGE_VIEWS.map(
      (view) => `${R2_BASE_URL}/${vehicle.imageFolder}/${view.key}.webp`
    );
  }, [vehicle.imageFolder]);

  // Calculate price
  const calculatedPrice = useMemo(() => {
    let price = vehicle.baseMonthlyPrice;

    const mileageDiff = (mileage - 10000) / 1000;
    price += mileageDiff * 8;

    if (term === 24) price *= 1.15;
    if (term === 48) price *= 0.92;

    if (upfront === 1) price *= 1.08;
    if (upfront === 6) price *= 0.96;
    if (upfront === 9) price *= 0.93;
    if (upfront === 12) price *= 0.90;

    if (!isBusiness) {
      price *= 1.2;
    }

    return Math.round(price * 100) / 100;
  }, [vehicle.baseMonthlyPrice, mileage, term, upfront, isBusiness]);

  const initialPayment = calculatedPrice * upfront;

  const handleImageError = (idx: number) => {
    setImageErrors((prev) => ({ ...prev, [idx]: true }));
  };

  // Mock technical specs if none provided
  const defaultSpecs: Record<string, Record<string, string>> = {
    Performance: {
      "Engine Power": vehicle.engineSize || "N/A",
      "0-62 mph": "7.5 seconds",
      "Top Speed": "130 mph",
      Transmission: vehicle.transmission,
    },
    Efficiency: {
      "Fuel Type": vehicle.fuelType,
      "Combined MPG": vehicle.mpg ? `${vehicle.mpg} mpg` : "N/A",
      "CO2 Emissions": vehicle.co2 ? `${vehicle.co2} g/km` : "N/A",
      ...(vehicle.electricRange && { "Electric Range": `${vehicle.electricRange} miles` }),
    },
    Dimensions: {
      Doors: vehicle.doors ? `${vehicle.doors} doors` : "N/A",
      Seats: vehicle.seats ? `${vehicle.seats} seats` : "N/A",
      "Body Type": vehicle.bodyType,
    },
  };

  const specsToShow = Object.keys(technicalSpecs).length > 0 ? technicalSpecs : defaultSpecs;

  // Mock features if none provided
  const defaultFeatures: Record<string, string[]> = {
    Safety: [
      "ABS with EBD",
      "Multiple airbags",
      "Electronic Stability Control",
      "Tyre Pressure Monitoring",
      "Hill Start Assist",
      "Rear parking sensors",
    ],
    Comfort: [
      "Automatic climate control",
      "Heated front seats",
      "Electric windows",
      "Cruise control",
      "Leather steering wheel",
    ],
    Technology: [
      "Touchscreen infotainment",
      "Apple CarPlay & Android Auto",
      "Bluetooth connectivity",
      "DAB radio",
      "USB ports",
    ],
    Exterior: [
      "LED headlights",
      "LED daytime running lights",
      "Alloy wheels",
      "Automatic wipers",
      "Heated mirrors",
    ],
  };

  const featuresToShow = Object.keys(features).length > 0 ? features : defaultFeatures;

  const toggleSpecSection = (section: string) => {
    setExpandedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleFeatureSection = (section: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "deal", label: "Deal Information", icon: <FileText size={18} /> },
    { id: "specs", label: "Technical Specs", icon: <Wrench size={18} /> },
    { id: "features", label: "Standard Features", icon: <Shield size={18} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.dark }}>
      {/* Breadcrumb */}
      <div className="border-b border-white/10 px-4 py-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-white/60">
            <Link href={basePath} className="hover:text-white">
              {vehicleType === "van" ? "Vans" : "Cars"}
            </Link>
            <ChevronRight size={14} />
            <Link href={`${basePath}?manufacturer=${vehicle.manufacturer.toLowerCase()}`} className="hover:text-white">
              {vehicle.manufacturer}
            </Link>
            <ChevronRight size={14} />
            <span className="text-white">{vehicle.model}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Gallery */}
          <div>
            {/* Main Image */}
            <div
              className="relative mb-4 overflow-hidden rounded-2xl"
              style={{ backgroundColor: colors.darkMid }}
            >
              <div className="aspect-[16/10]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    src={
                      imageErrors[currentImageIndex]
                        ? "/images/car-placeholder.webp"
                        : imageUrls[currentImageIndex]
                    }
                    alt={`${vehicle.manufacturer} ${vehicle.model} - ${IMAGE_VIEWS[currentImageIndex].label}`}
                    className="h-full w-full object-cover"
                    onError={() => handleImageError(currentImageIndex)}
                  />
                </AnimatePresence>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={() =>
                  setCurrentImageIndex(
                    (prev) => (prev - 1 + imageUrls.length) % imageUrls.length
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() =>
                  setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/70"
              >
                <ChevronRight size={24} />
              </button>

              {/* Share & Wishlist */}
              <div className="absolute right-4 top-4 flex gap-2">
                <button className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-black/70">
                  <Share2 size={18} />
                </button>
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`rounded-full p-2.5 backdrop-blur-sm transition-all ${
                    isWishlisted ? "bg-red-500 text-white" : "bg-black/50 text-white hover:bg-red-500"
                  }`}
                >
                  <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {IMAGE_VIEWS.map((view, idx) => (
                <button
                  key={view.key}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                    idx === currentImageIndex
                      ? "ring-2 ring-cyan-500"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={imageErrors[idx] ? "/images/car-placeholder.webp" : imageUrls[idx]}
                    alt={view.label}
                    className="h-16 w-24 object-cover"
                    onError={() => handleImageError(idx)}
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-xs text-white">
                    {view.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Specs Summary */}
            <div
              className="mt-6 grid grid-cols-4 gap-3 rounded-xl p-4"
              style={{ backgroundColor: colors.darkMid }}
            >
              <div className="text-center">
                <Fuel size={20} className="mx-auto mb-1 text-white/60" />
                <p className="text-xs text-white/50">Fuel</p>
                <p className="text-sm font-medium text-white">{vehicle.fuelType}</p>
              </div>
              <div className="text-center">
                <Settings size={20} className="mx-auto mb-1 text-white/60" />
                <p className="text-xs text-white/50">Gearbox</p>
                <p className="text-sm font-medium text-white">{vehicle.transmission}</p>
              </div>
              <div className="text-center">
                <Users size={20} className="mx-auto mb-1 text-white/60" />
                <p className="text-xs text-white/50">Seats</p>
                <p className="text-sm font-medium text-white">{vehicle.seats || 5}</p>
              </div>
              <div className="text-center">
                <Car size={20} className="mx-auto mb-1 text-white/60" />
                <p className="text-xs text-white/50">Doors</p>
                <p className="text-sm font-medium text-white">{vehicle.doors || 5}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Details & Calculator */}
          <div>
            {/* Title */}
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-wider text-white/50">
                {vehicle.manufacturer}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">
                {vehicle.model}
              </h1>
              <p className="mt-2 text-lg text-white/70">{vehicle.derivative}</p>

              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {vehicle.isNew && (
                  <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1.5 text-sm font-bold text-white">
                    NEW MODEL
                  </span>
                )}
                {vehicle.isSpecialOffer && (
                  <span
                    className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
                    style={{ backgroundColor: colors.accentOrange }}
                  >
                    SPECIAL OFFER
                  </span>
                )}
                {vehicle.fuelType?.toLowerCase() === "electric" && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500 px-4 py-1.5 text-sm font-bold text-white">
                    <Zap size={14} />
                    ELECTRIC
                  </span>
                )}
                {vehicle.electricRange && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-500 px-4 py-1.5 text-sm font-bold text-white">
                    <Battery size={14} />
                    {vehicle.electricRange} mile range
                  </span>
                )}
              </div>
            </div>

            {/* Calculator Card */}
            <div
              className="mb-6 rounded-2xl border border-white/10 p-6"
              style={{ backgroundColor: colors.darkMid }}
            >
              <div className="mb-6 flex items-center gap-2">
                <Calculator size={20} style={{ color: colors.accent }} />
                <h2 className="text-lg font-semibold text-white">Your Quote</h2>
              </div>

              {/* Business/Personal Toggle */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Lease Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsBusiness(false)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all ${
                      !isBusiness
                        ? "bg-cyan-500 text-black"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <User size={18} />
                    Personal
                  </button>
                  <button
                    onClick={() => setIsBusiness(true)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-all ${
                      isBusiness
                        ? "bg-cyan-500 text-black"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <Building2 size={18} />
                    Business
                  </button>
                </div>
              </div>

              {/* Contract Length */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Contract Length
                </label>
                <div className="flex gap-2">
                  {TERM_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTerm(t)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        term === t
                          ? "bg-white/20 text-white"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {t} months
                    </button>
                  ))}
                </div>
              </div>

              {/* Annual Mileage */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Annual Mileage
                </label>
                <select
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  {MILEAGE_OPTIONS.map((m) => (
                    <option key={m} value={m} className="bg-gray-900">
                      {m.toLocaleString()} miles per year
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Payment */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Initial Payment
                </label>
                <div className="flex flex-wrap gap-2">
                  {UPFRONT_OPTIONS.map((u) => (
                    <button
                      key={u}
                      onClick={() => setUpfront(u)}
                      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                        upfront === u
                          ? "bg-white/20 text-white"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {u} months
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Display */}
              <div
                className="mb-6 rounded-xl p-4"
                style={{ backgroundColor: `${colors.accent}15` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Monthly Payment</p>
                    <p className="text-3xl font-bold" style={{ color: colors.accent }}>
                      £{calculatedPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-white/50">
                      {isBusiness ? "+VAT" : "inc. VAT"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Initial Payment</p>
                    <p className="text-2xl font-bold text-white">
                      £{initialPayment.toFixed(2)}
                    </p>
                    <p className="text-xs text-white/50">
                      ({upfront} x £{calculatedPrice.toFixed(2)})
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-black transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: colors.accent }}
                >
                  Lease This {vehicleType === "van" ? "Van" : "Car"}
                </button>
                <a
                  href="tel:01905686887"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white transition-all hover:bg-white/10"
                >
                  <Phone size={20} />
                </a>
              </div>

              <p className="mt-4 text-center text-xs text-white/40">
                Prices are subject to status and may vary. Contact us for a personalised quote.
              </p>
            </div>

            {/* Add to Wishlist Button */}
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                isWishlisted
                  ? "bg-red-500/20 text-red-400"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
              {isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          {/* Tab Headers */}
          <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap px-6 py-4 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "border-b-2 border-cyan-500 text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-8">
            <AnimatePresence mode="wait">
              {activeTab === "deal" && (
                <motion.div
                  key="deal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div
                    className="rounded-2xl p-6"
                    style={{ backgroundColor: colors.darkMid }}
                  >
                    <h3 className="mb-4 text-lg font-semibold text-white">
                      What's included in your lease?
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { title: "Road Tax", desc: "Included for the duration of your lease" },
                        { title: "Manufacturer Warranty", desc: "Full manufacturer warranty coverage" },
                        { title: "Breakdown Cover", desc: "24/7 roadside assistance included" },
                        { title: "Free Delivery", desc: "Delivered to your door at no extra cost" },
                        { title: "Full Maintenance", desc: "Optional maintenance package available" },
                        { title: "Flexible Mileage", desc: "Choose the mileage that suits you" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-white/5 p-4"
                        >
                          <Check
                            size={20}
                            className="mb-2"
                            style={{ color: colors.accent }}
                          />
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="mt-1 text-sm text-white/60">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "specs" && (
                <motion.div
                  key="specs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {Object.entries(specsToShow).map(([category, specs]) => (
                    <div
                      key={category}
                      className="overflow-hidden rounded-xl border border-white/10"
                      style={{ backgroundColor: colors.darkMid }}
                    >
                      <button
                        onClick={() => toggleSpecSection(category)}
                        className="flex w-full items-center justify-between p-4 text-left"
                      >
                        <span className="font-medium text-white">{category}</span>
                        <ChevronDown
                          size={20}
                          className={`text-white/50 transition-transform ${
                            expandedSpecs.has(category) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedSpecs.has(category) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/10 px-4 py-3">
                              {Object.entries(specs).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0"
                                >
                                  <span className="text-sm text-white/60">{key}</span>
                                  <span className="text-sm font-medium text-white">{value}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "features" && (
                <motion.div
                  key="features"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {Object.entries(featuresToShow).map(([category, items]) => (
                    <div
                      key={category}
                      className="overflow-hidden rounded-xl border border-white/10"
                      style={{ backgroundColor: colors.darkMid }}
                    >
                      <button
                        onClick={() => toggleFeatureSection(category)}
                        className="flex w-full items-center justify-between p-4 text-left"
                      >
                        <span className="font-medium text-white">{category}</span>
                        <ChevronDown
                          size={20}
                          className={`text-white/50 transition-transform ${
                            expandedFeatures.has(category) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {expandedFeatures.has(category) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/10 p-4">
                              <ul className="grid gap-2 sm:grid-cols-2">
                                {items.map((feature, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 text-sm text-white/80"
                                  >
                                    <Check size={14} style={{ color: colors.accent }} />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
