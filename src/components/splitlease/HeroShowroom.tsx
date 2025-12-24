"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Tag,
} from "lucide-react";

interface SpecialOffer {
  id: string;
  manufacturer: string;
  model: string;
  derivative: string;
  imageFolder?: string;
  wasPrice: number;
  nowPrice: number;
  savings: number;
  term: number;
  tag?: string;
}

// Mock special offers - in production, fetch from API
const specialOffers: SpecialOffer[] = [
  {
    id: "1",
    manufacturer: "BMW",
    model: "3 Series",
    derivative: "320d M Sport",
    imageFolder: "bmw/3-series",
    wasPrice: 549,
    nowPrice: 449,
    savings: 100,
    term: 36,
    tag: "Hot Deal",
  },
  {
    id: "2",
    manufacturer: "Mercedes",
    model: "A-Class",
    derivative: "A200 AMG Line",
    imageFolder: "mercedes/a-class",
    wasPrice: 489,
    nowPrice: 399,
    savings: 90,
    term: 36,
    tag: "Limited",
  },
  {
    id: "3",
    manufacturer: "Audi",
    model: "A4",
    derivative: "35 TFSI S Line",
    imageFolder: "audi/a4",
    wasPrice: 529,
    nowPrice: 429,
    savings: 100,
    term: 48,
    tag: "Popular",
  },
  {
    id: "4",
    manufacturer: "Tesla",
    model: "Model 3",
    derivative: "Long Range AWD",
    imageFolder: "tesla/model-3",
    wasPrice: 599,
    nowPrice: 499,
    savings: 100,
    term: 36,
    tag: "EV Deal",
  },
];

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_IMAGE_URL || "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";

export default function HeroShowroom() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const activeOffer = specialOffers[activeIndex];

  // Auto-rotate offers
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % specialOffers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const nextOffer = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % specialOffers.length);
  };

  const prevOffer = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + specialOffers.length) % specialOffers.length);
  };

  const getImageUrl = (folder?: string) => {
    if (!folder) return "/images/car-placeholder.webp";
    return `${R2_BASE_URL}/${folder}/front_view.webp`;
  };

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#0a0a0f]">
      {/* Dramatic gradient background */}
      <div className="absolute inset-0">
        {/* Main gradient - dark with cyan/orange accents */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 100%, rgba(121, 213, 233, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 0%, rgba(247, 125, 17, 0.1) 0%, transparent 50%),
              linear-gradient(180deg, #0a0a0f 0%, #0f1419 100%)
            `
          }}
        />

        {/* Animated glow behind featured car */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
          style={{ backgroundColor: "#79d5e9" }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Grid lines for showroom floor effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(90deg, #fff 1px, transparent 1px),
              linear-gradient(180deg, #fff 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "bottom",
          }}
        />
      </div>

      {/* Content container */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
        {/* Top bar - Special Offers badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-orange-400">
                Special Offers
              </h2>
              <p className="text-xs text-white/50">Limited time deals</p>
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="flex gap-2">
            <button
              onClick={prevOffer}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextOffer}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>

        {/* Main hero content - asymmetric layout */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
          {/* Featured vehicle - takes most space */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOffer.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {/* Tag badge */}
                {activeOffer.tag && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/25"
                  >
                    <Sparkles size={12} />
                    {activeOffer.tag}
                  </motion.div>
                )}

                {/* Vehicle image container */}
                <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-gradient-to-br from-white/5 to-transparent">
                  {/* Reflection gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a0a0f] to-transparent" />

                  {/* Vehicle image */}
                  <motion.img
                    key={`img-${activeOffer.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    src={getImageUrl(activeOffer.imageFolder)}
                    alt={`${activeOffer.manufacturer} ${activeOffer.model}`}
                    className="h-full w-full object-contain object-center p-8"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/car-placeholder.webp";
                    }}
                  />
                </div>

                {/* Vehicle info overlay - bottom left */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-8 left-8 right-8"
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
                        {activeOffer.manufacturer}
                      </p>
                      <h1 className="mt-1 text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                        {activeOffer.model}
                      </h1>
                      <p className="mt-2 text-lg text-white/60">
                        {activeOffer.derivative}
                      </p>
                    </div>

                    {/* Price badge */}
                    <div className="hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl sm:block">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/40 line-through">
                          £{activeOffer.wasPrice}
                        </span>
                        <span className="rounded-md bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                          Save £{activeOffer.savings}/mo
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-cyan-400">
                          £{activeOffer.nowPrice}
                        </span>
                        <span className="text-sm text-white/60">/month</span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        {activeOffer.term} months • +VAT
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Mobile price display */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/40 line-through">
                      £{activeOffer.wasPrice}
                    </span>
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                      Save £{activeOffer.savings}/mo
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-cyan-400">
                      £{activeOffer.nowPrice}
                    </span>
                    <span className="text-sm text-white/60">/month</span>
                  </div>
                </div>
                <Link
                  href={`/cars/${activeOffer.id}`}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-black transition-all hover:bg-cyan-300"
                >
                  View Deal
                </Link>
              </div>
            </div>
          </div>

          {/* Side panel - other offers */}
          <div className="lg:col-span-4">
            <div className="flex h-full flex-col">
              {/* Section header */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">
                  More Deals
                </h3>
                <Link
                  href="/special-offers"
                  className="flex items-center gap-1 text-xs font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  View All
                  <ArrowRight size={12} />
                </Link>
              </div>

              {/* Offer cards */}
              <div className="flex flex-1 flex-col gap-3">
                {specialOffers.map((offer, index) => (
                  <motion.button
                    key={offer.id}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setActiveIndex(index);
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`group relative flex items-center gap-4 overflow-hidden rounded-xl border p-3 text-left transition-all ${
                      index === activeIndex
                        ? "border-cyan-400/50 bg-cyan-400/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {/* Active indicator */}
                    {index === activeIndex && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 h-full w-1 bg-cyan-400"
                      />
                    )}

                    {/* Thumbnail */}
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <img
                        src={getImageUrl(offer.imageFolder)}
                        alt={offer.model}
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/car-placeholder.webp";
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                        {offer.manufacturer}
                      </p>
                      <p className="truncate font-bold text-white">
                        {offer.model}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-lg font-bold text-cyan-400">
                          £{offer.nowPrice}
                        </span>
                        <span className="text-xs text-white/40">/mo</span>
                      </div>
                    </div>

                    {/* Savings badge */}
                    <div className="shrink-0 rounded-lg bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400">
                      -£{offer.savings}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* CTA button - desktop */}
              <div className="mt-6 hidden lg:block">
                <Link
                  href={`/cars/${activeOffer.id}`}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 py-4 text-sm font-bold text-black transition-all hover:from-cyan-300 hover:to-cyan-400"
                >
                  Get This Deal
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                {/* Trust badges */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Quick delivery
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    No hidden fees
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {specialOffers.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAutoPlaying(false);
                setActiveIndex(index);
              }}
              className="group relative h-1 overflow-hidden rounded-full transition-all"
              style={{ width: index === activeIndex ? 32 : 16 }}
            >
              <div className="absolute inset-0 bg-white/20" />
              {index === activeIndex && (
                <motion.div
                  className="absolute inset-0 bg-cyan-400"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 5, ease: "linear" }}
                  key={`progress-${activeIndex}`}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
