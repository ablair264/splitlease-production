"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Zap,
  Leaf,
  Building2,
  User,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Color scheme matching Figma design
const colors = {
  dark: "#0f1419",
  cardBg: "rgba(94,94,94,0.06)",
  cardBgEnd: "rgba(255,255,255,0.06)",
  accent: "#00fff2",
  termBadge: "#041d4c",
  mileageBadge: "#065f17",
};

// R2 image base URL
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_IMAGE_URL || "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";

// Image view types for the carousel (currently only front_view available)
const IMAGE_VIEWS = ["front_view"];

export interface Vehicle {
  id: string;
  manufacturer: string;
  model: string;
  derivative: string;
  fuelType: string;
  bodyType: string;
  transmission: string;
  engineSize?: string;
  co2?: number;
  mpg?: number;
  electricRange?: number;
  doors?: number;
  seats?: number;
  imageFolder?: string;
  isNew?: boolean;
  isSpecialOffer?: boolean;
  quickDelivery?: boolean;
  baseMonthlyPrice: number;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  index?: number;
  onWishlistToggle?: (id: string) => void;
  isWishlisted?: boolean;
  // Controlled expansion props
  isExpanded?: boolean;
  onToggleExpand?: (id: string | null) => void;
  columns?: number;
}

// Default lease terms
const DEFAULT_TERM = 36;
const DEFAULT_MILEAGE = 10000;
const DEFAULT_UPFRONT = 3;

// Mileage options
const MILEAGE_OPTIONS = [5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];

// Term options
const TERM_OPTIONS = [24, 36, 48];

// Upfront payment options
const UPFRONT_OPTIONS = [1, 3, 6, 9, 12];

export default function VehicleCard({
  vehicle,
  index = 0,
  onWishlistToggle,
  isWishlisted = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
  columns = 1,
}: VehicleCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggleExpand = (expand: boolean) => {
    if (onToggleExpand) {
      onToggleExpand(expand ? vehicle.id : null);
    } else {
      setInternalExpanded(expand);
    }
  };

  // Calculator state
  const [mileage, setMileage] = useState(DEFAULT_MILEAGE);
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [upfront, setUpfront] = useState(DEFAULT_UPFRONT);
  const [isBusiness, setIsBusiness] = useState(false);

  // Calculate adjusted monthly price
  const calculatedPrice = useMemo(() => {
    let price = vehicle.baseMonthlyPrice;
    const mileageDiff = (mileage - DEFAULT_MILEAGE) / 1000;
    price += mileageDiff * 8;
    if (term === 24) price *= 1.15;
    if (term === 48) price *= 0.92;
    if (upfront === 1) price *= 1.08;
    if (upfront === 6) price *= 0.96;
    if (upfront === 9) price *= 0.93;
    if (upfront === 12) price *= 0.90;
    if (!isBusiness) price *= 1.2;
    return Math.round(price * 100) / 100;
  }, [vehicle.baseMonthlyPrice, mileage, term, upfront, isBusiness]);

  const initialPayment = calculatedPrice * upfront;
  const numberOfPayments = term - 1;

  // Generate image URLs
  const imageUrls = useMemo(() => {
    if (!vehicle.imageFolder) {
      return ["/images/car-placeholder.webp"];
    }
    return IMAGE_VIEWS.map(
      (view) => `${R2_BASE_URL}/${vehicle.imageFolder}/${view}.webp`
    );
  }, [vehicle.imageFolder]);

  const nextImage = () => {
    if (isExpanded) {
      setCurrentImageIndex((prev) =>
        Math.min(prev + 2, imageUrls.length - 2)
      );
    } else {
      setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
    }
  };

  const prevImage = () => {
    if (isExpanded) {
      setCurrentImageIndex((prev) => Math.max(prev - 2, 0));
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
    }
  };

  const handleImageError = (idx: number) => {
    setImageError((prev) => ({ ...prev, [idx]: true }));
  };

  // Get fuel type badge
  const getFuelBadge = () => {
    const fuel = vehicle.fuelType?.toLowerCase();
    if (fuel?.includes("electric")) {
      return { icon: <Zap size={10} />, label: "EV", color: "#22c55e" };
    }
    if (fuel?.includes("hybrid")) {
      return { icon: <Leaf size={10} />, label: "Hybrid", color: "#84cc16" };
    }
    return null;
  };

  const fuelBadge = getFuelBadge();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, layout: { duration: 0.3 } }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10",
        "bg-gradient-to-b from-[rgba(94,94,94,0.06)] to-[rgba(255,255,255,0.06)]",
      )}
      style={isExpanded ? { gridColumn: `1 / span ${Math.max(columns, 1)}` } : undefined}
    >
      <div className={cn(
        "flex flex-col",
        // Horizontal layout when expanded on md+ screens
        isExpanded && "md:flex-row"
      )}>
        {/* Left Section - Image & Info */}
        <div className={cn(
          "flex flex-col",
          isExpanded ? "md:w-1/2" : "w-full"
        )}>
          {/* Image Carousel */}
          <div className={cn(
            "relative overflow-hidden",
            isExpanded ? "aspect-[16/10]" : "aspect-[3/2]"
          )}>
            <AnimatePresence mode="wait">
              {isExpanded ? (
                // Two images side by side when expanded
                <motion.div
                  key={`expanded-${currentImageIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full w-full gap-2 p-4"
                >
                  <div className="relative h-full flex-1 overflow-hidden rounded-lg">
                    <img
                      src={imageError[currentImageIndex] ? "/images/car-placeholder.webp" : imageUrls[currentImageIndex]}
                      alt={`${vehicle.manufacturer} ${vehicle.model} - View 1`}
                      className="h-full w-full object-cover"
                      onError={() => handleImageError(currentImageIndex)}
                    />
                  </div>
                  {imageUrls[currentImageIndex + 1] && (
                    <div className="relative h-full flex-1 overflow-hidden rounded-lg">
                      <img
                        src={imageError[currentImageIndex + 1] ? "/images/car-placeholder.webp" : imageUrls[currentImageIndex + 1]}
                        alt={`${vehicle.manufacturer} ${vehicle.model} - View 2`}
                        className="h-full w-full object-cover"
                        onError={() => handleImageError(currentImageIndex + 1)}
                      />
                    </div>
                  )}
                </motion.div>
              ) : (
                // Single image when collapsed
                <motion.img
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={imageError[currentImageIndex] ? "/images/car-placeholder.webp" : imageUrls[currentImageIndex]}
                  alt={`${vehicle.manufacturer} ${vehicle.model}`}
                  className="h-full w-full object-cover object-center p-4"
                  onError={() => handleImageError(currentImageIndex)}
                />
              )}
            </AnimatePresence>

            {/* Image Navigation */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            {/* Wishlist Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onWishlistToggle?.(vehicle.id); }}
              className={cn(
                "absolute right-4 top-4 rounded-full p-2.5 backdrop-blur-sm transition-all",
                isWishlisted
                  ? "bg-red-500 text-white"
                  : "bg-black/50 text-white hover:bg-red-500"
              )}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
            </button>

            {/* Fuel Badge */}
            {fuelBadge && (
              <span
                className="absolute left-4 top-4 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase text-white"
                style={{ backgroundColor: fuelBadge.color }}
              >
                {fuelBadge.icon}
                {fuelBadge.label}
              </span>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="flex flex-col p-6 pt-2">
            {/* Manufacturer */}
            <p className="text-sm font-normal tracking-wide text-white">
              {vehicle.manufacturer.toUpperCase()}
            </p>

            {/* Model - remove manufacturer prefix if present */}
            <h3 className={cn(
              "mt-1 font-bold leading-tight text-white",
              isExpanded ? "text-2xl" : "text-[28px]"
            )}>
              {vehicle.model.replace(new RegExp(`^${vehicle.manufacturer}\\s*`, 'i'), '')}
            </h3>
            <p className="mt-1 text-sm font-light text-white/80">
              {vehicle.derivative}
            </p>

            {/* Term & Mileage Badges */}
            <div className="mt-4 flex gap-2">
              <span
                className="rounded-br-xl rounded-tl-xl px-3 py-2 text-[13px] font-extrabold text-white"
                style={{ backgroundColor: colors.termBadge }}
              >
                {term / 12} Yrs
              </span>
              <span
                className="rounded-br-xl rounded-tl-xl px-3 py-2 text-[13px] font-extrabold text-white"
                style={{ backgroundColor: colors.mileageBadge }}
              >
                {(mileage / 1000)}K Miles
              </span>
            </div>

            {/* Payment Info */}
            <div className="mt-4">
              <p className="text-white">
                <span className="text-lg font-bold">1 x £{initialPayment.toFixed(2)}</span>
                <span className="ml-2 text-xs font-light">followed by {numberOfPayments} x payments of</span>
              </p>
            </div>

            {/* Monthly Price */}
            <div className="mt-1">
              <p
                className="text-[36px] font-extrabold leading-tight"
                style={{ color: colors.accent }}
              >
                £{calculatedPrice.toFixed(2)}
              </p>
              <p className="text-base font-semibold text-white">
                per month {isBusiness ? "(excl. VAT)" : "(incl. VAT)"}
              </p>
            </div>

            {/* View Deal Button - Only on collapsed */}
            {!isExpanded && (
              <button
                onClick={() => handleToggleExpand(true)}
                className="mt-4 w-full rounded-lg bg-white/10 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
              >
                View Deal
              </button>
            )}
          </div>
        </div>

        {/* Right Section - Calculator (only when expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col border-t border-white/10 p-6 md:w-1/2 md:border-l md:border-t-0"
            >
              {/* Calculator Header */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-bold text-white">Customise Your Quote</h4>
                <button
                  onClick={() => handleToggleExpand(false)}
                  className="rounded-full bg-white/10 p-2 text-white/70 transition-all hover:bg-white/20 hover:text-white"
                  aria-label="Close calculator"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Business/Personal Toggle */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Lease Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsBusiness(false)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                      !isBusiness
                        ? "text-black"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    )}
                    style={!isBusiness ? { backgroundColor: colors.accent } : {}}
                  >
                    <User size={16} />
                    Personal
                  </button>
                  <button
                    onClick={() => setIsBusiness(true)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
                      isBusiness
                        ? "text-black"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    )}
                    style={isBusiness ? { backgroundColor: colors.accent } : {}}
                  >
                    <Building2 size={16} />
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
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                        term === t
                          ? "bg-white/20 text-white"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      )}
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                >
                  {MILEAGE_OPTIONS.map((m) => (
                    <option key={m} value={m} className="bg-gray-900">
                      {m.toLocaleString()} miles
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Payment */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50">
                  Initial Payment (months)
                </label>
                <div className="flex flex-wrap gap-2">
                  {UPFRONT_OPTIONS.map((u) => (
                    <button
                      key={u}
                      onClick={() => setUpfront(u)}
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                        upfront === u
                          ? "bg-white/20 text-white"
                          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Summary */}
              <div className="mt-auto rounded-xl bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-white/60">1 x Initial Payment</span>
                  <span className="text-lg font-bold text-white">
                    £{initialPayment.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">{numberOfPayments} x Monthly</span>
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color: colors.accent }}
                  >
                    £{calculatedPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/cars/${vehicle.id}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-semibold text-black transition-all hover:opacity-90"
                  style={{ backgroundColor: colors.accent }}
                >
                  Full Details
                  <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
