"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Truck,
  Zap,
  Clock,
  Shield,
  PoundSterling,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Award,
  Phone,
  Play,
} from "lucide-react";
import VehicleCard, { Vehicle } from "./VehicleCard";
import Header from "./Header";
import Footer from "./Footer";
import HeroShowroom from "./HeroShowroom";
import { cn } from "@/lib/utils";

// Color scheme matching Header/Footer
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
};

// Stats data
const stats = [
  { value: "15,000+", label: "Happy Customers", icon: Users },
  { value: "500+", label: "Vehicles Available", icon: Car },
  { value: "4.9", label: "Customer Rating", icon: Star },
  { value: "98%", label: "Would Recommend", icon: Award },
];

// Why lease benefits
const benefits = [
  {
    icon: PoundSterling,
    title: "Fixed Monthly Payments",
    description: "Know exactly what you'll pay each month with no hidden costs or surprises.",
  },
  {
    icon: Shield,
    title: "Full Warranty Cover",
    description: "All vehicles come with manufacturer warranty for complete peace of mind.",
  },
  {
    icon: Clock,
    title: "Flexible Terms",
    description: "Choose contract lengths from 24 to 48 months to suit your needs.",
  },
  {
    icon: TrendingUp,
    title: "No Depreciation Worries",
    description: "Hand back the keys at the end - no concerns about resale value.",
  },
  {
    icon: Zap,
    title: "Latest Models",
    description: "Drive the newest vehicles with the latest technology and safety features.",
  },
  {
    icon: CheckCircle2,
    title: "Road Tax Included",
    description: "Road tax is included for the duration of your lease agreement.",
  },
];

// Vehicle categories
const categories = [
  {
    title: "Cars",
    description: "Personal and business car leasing",
    icon: Car,
    href: "/cars",
    count: "350+ vehicles",
    image: "/images/category-cars.webp",
  },
  {
    title: "Vans",
    description: "Commercial van leasing solutions",
    icon: Truck,
    href: "/vans",
    count: "150+ vehicles",
    image: "/images/category-vans.webp",
  },
  {
    title: "Electric",
    description: "Zero emission vehicles",
    icon: Zap,
    href: "/cars?fuelType=electric",
    count: "80+ vehicles",
    image: "/images/category-electric.webp",
  },
  {
    title: "Quick Delivery",
    description: "Ready within 14 days",
    icon: Clock,
    href: "/quick-delivery",
    count: "50+ vehicles",
    image: "/images/category-quick.webp",
  },
];

// How it works steps
const steps = [
  {
    number: "01",
    title: "Choose Your Vehicle",
    description: "Browse our extensive range of cars and vans. Use filters to find your perfect match.",
  },
  {
    number: "02",
    title: "Configure Your Lease",
    description: "Select your mileage, contract length, and initial payment to tailor your deal.",
  },
  {
    number: "03",
    title: "Get a Quote",
    description: "Receive your personalised quote instantly. No obligation, completely transparent.",
  },
  {
    number: "04",
    title: "Drive Away",
    description: "Complete your application and we'll deliver your new vehicle to your door.",
  },
];

// Reviews/testimonials
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Business Owner",
    content: "SplitLease made getting a company car incredibly easy. The whole process was smooth and the team was very helpful.",
    rating: 5,
    vehicle: "BMW 3 Series",
  },
  {
    name: "James Thompson",
    role: "Personal Lease",
    content: "Best decision I made was leasing through SplitLease. Fixed monthly cost and a brand new car every 3 years!",
    rating: 5,
    vehicle: "Mercedes A-Class",
  },
  {
    name: "Emily Chen",
    role: "Fleet Manager",
    content: "Managing our company fleet has never been easier. Great rates and excellent customer service throughout.",
    rating: 5,
    vehicle: "Ford Transit",
  },
];


export default function Homepage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);
  const [specialOfferVehicles, setSpecialOfferVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Fetch featured vehicles from API
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        // Fetch featured vehicles (first 4 vehicles sorted by price)
        const featuredResponse = await fetch("/api/vehicles?limit=4&sortBy=price-asc");
        if (featuredResponse.ok) {
          const featuredData = await featuredResponse.json();
          setFeaturedVehicles(featuredData.vehicles);
        }

        // Fetch special offer vehicles (4 different vehicles)
        const offersResponse = await fetch("/api/vehicles?limit=4&sortBy=price-desc");
        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          setSpecialOfferVehicles(offersData.vehicles);
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.dark }}>
      <Header />

      {/* Hero Section - Special Offers Showroom */}
      <HeroShowroom />

      {/* Stats Section */}
      <section
        className="border-y border-white/10 py-12"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <Icon
                    size={24}
                    className="mx-auto mb-3"
                    style={{ color: colors.accent }}
                  />
                  <div className="text-3xl font-bold text-white md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-white/60">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Browse by Category
            </h2>
            <p className="mt-4 text-white/60">
              Find the perfect vehicle for your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={category.href}
                    className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all hover:border-white/20 hover:from-white/10"
                  >
                    <div className="relative z-10">
                      <div
                        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${colors.accent}20` }}
                      >
                        <Icon size={24} style={{ color: colors.accent }} />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {category.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">
                        {category.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <span
                          className="text-sm font-medium"
                          style={{ color: colors.accent }}
                        >
                          {category.count}
                        </span>
                        <ChevronRight
                          size={20}
                          className="text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-white"
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Vehicles Section */}
      <section className="py-20" style={{ backgroundColor: colors.darkMid }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Featured Vehicles
              </h2>
              <p className="mt-4 text-white/60">
                Hand-picked deals from our team
              </p>
            </div>
            <Link
              href="/cars"
              className="hidden items-center gap-2 text-sm font-medium transition-colors hover:text-white md:flex"
              style={{ color: colors.accent }}
            >
              View All
              <ChevronRight size={18} />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-white/10"
                  style={{ backgroundColor: colors.darkMid }}
                >
                  <div className="aspect-[4/3] bg-white/5" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-6 bg-white/10 rounded w-2/3" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-8 bg-white/10 rounded w-1/2 mt-4" />
                  </div>
                </div>
              ))
            ) : featuredVehicles.length > 0 ? (
              featuredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, layout: { duration: 0.3 } }}
                  className={cn(
                    expandedVehicleId === vehicle.id && "col-span-full"
                  )}
                >
                  <VehicleCard
                    vehicle={vehicle}
                    isExpanded={expandedVehicleId === vehicle.id}
                    onToggleExpand={setExpandedVehicleId}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-4 text-center py-12 text-white/60">
                No featured vehicles available
              </div>
            )}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/cars"
              className="inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: colors.accent }}
            >
              View All Vehicles
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Lease Section */}
      <section className="py-20" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Why Lease with SplitLease?
            </h2>
            <p className="mt-4 text-white/60">
              Discover the benefits of vehicle leasing
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all hover:border-white/20"
                >
                  <div
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <Icon size={24} style={{ color: colors.accent }} />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      <section className="py-20" style={{ backgroundColor: colors.darkMid }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: `${colors.accentOrange}20`,
                  color: colors.accentOrange,
                }}
              >
                <Zap size={16} />
                Limited Time
              </div>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Special Offers
              </h2>
              <p className="mt-4 text-white/60">
                Don't miss out on these exclusive deals
              </p>
            </div>
            <Link
              href="/special-offers"
              className="hidden items-center gap-2 text-sm font-medium transition-colors hover:text-white md:flex"
              style={{ color: colors.accent }}
            >
              View All Offers
              <ChevronRight size={18} />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-white/10"
                  style={{ backgroundColor: colors.darkMid }}
                >
                  <div className="aspect-[4/3] bg-white/5" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-6 bg-white/10 rounded w-2/3" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-8 bg-white/10 rounded w-1/2 mt-4" />
                  </div>
                </div>
              ))
            ) : specialOfferVehicles.length > 0 ? (
              specialOfferVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, layout: { duration: 0.3 } }}
                  className={cn(
                    expandedVehicleId === vehicle.id && "col-span-full"
                  )}
                >
                  <VehicleCard
                    vehicle={vehicle}
                    isExpanded={expandedVehicleId === vehicle.id}
                    onToggleExpand={setExpandedVehicleId}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-4 text-center py-12 text-white/60">
                No special offers available
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              How Leasing Works
            </h2>
            <p className="mt-4 text-white/60">
              Get on the road in four simple steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-8 hidden h-0.5 w-full translate-x-1/2 lg:block">
                    <div
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(to right, ${colors.accent}40, transparent)`,
                      }}
                    />
                  </div>
                )}

                <div className="relative z-10 text-center lg:text-left">
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl font-bold lg:mx-0"
                    style={{
                      backgroundColor: `${colors.accent}20`,
                      color: colors.accent,
                    }}
                  >
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/leasing/how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10"
            >
              Learn More About Leasing
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20" style={{ backgroundColor: colors.darkMid }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              What Our Customers Say
            </h2>
            <p className="mt-4 text-white/60">
              Join thousands of happy customers
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6"
              >
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={colors.accentOrange}
                      color={colors.accentOrange}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-white/80">"{testimonial.content}"</p>

                {/* Author */}
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-white/60">
                      {testimonial.role}
                    </div>
                  </div>
                  <div
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${colors.accent}20`,
                      color: colors.accent,
                    }}
                  >
                    {testimonial.vehicle}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
              style={{ color: colors.accent }}
            >
              Read More Reviews
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-12 lg:p-16"
            style={{ backgroundColor: colors.darkLight }}
          >
            {/* Background decoration */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: colors.accent }}
            />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: colors.accentOrange }}
            />

            <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-bold text-white md:text-4xl">
                  Ready to Get Started?
                </h2>
                <p className="mt-4 max-w-lg text-white/70">
                  Our team is here to help you find the perfect vehicle. Get in
                  touch today for a personalized quote.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/cars"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-sm font-semibold text-black transition-all hover:scale-105"
                  style={{ backgroundColor: colors.accent }}
                >
                  Browse Vehicles
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="tel:01905686887"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/10"
                >
                  <Phone size={18} />
                  01905 686887
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Placeholder for video - in production this would be an iframe or video element */}
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Play size={64} className="mx-auto mb-4 text-white/40" />
                  <p className="text-white/60">Video player placeholder</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
