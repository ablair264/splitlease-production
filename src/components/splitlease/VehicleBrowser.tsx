"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Grid3X3,
  List,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import VehicleCard, { Vehicle } from "./VehicleCard";
import { buildVehicleRows } from "@/lib/vehicle-layout";

// Color scheme
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
};

// Filter options
const BODY_TYPES = ["Hatchback", "Saloon", "Estate", "SUV", "Coupe", "Convertible", "MPV"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const PRICE_RANGES = [
  { label: "Under £200", min: 0, max: 200 },
  { label: "£200 - £300", min: 200, max: 300 },
  { label: "£300 - £400", min: 300, max: 400 },
  { label: "£400 - £500", min: 400, max: 500 },
  { label: "£500+", min: 500, max: 99999 },
];

const SPECIAL_OFFERS: PromoCardProps["vehicle"][] = [
  {
    id: "vw-tiguan-tdi-match",
    model: "Tiguan",
    variant: "2.0 TDI Match 5Dr Auto",
    price: 299,
    manufacturer: "Volkswagen",
    logoText: "VW",
    href: "/cars/vw-tiguan-tdi-match",
    logoUrl: "/logos/vw.avif",
    carImageUrl: "/images/car-placeholder.webp",
  },
  {
    id: "tesla-model-3-long-range",
    model: "Model 3",
    variant: "Long Range Auto",
    price: 389,
    manufacturer: "Tesla",
    logoText: "TS",
    href: "/cars/tesla-model-3-long-range",
    carImageUrl: "/images/car-placeholder.webp",
  },
  {
    id: "ford-transit-custom",
    model: "Transit Custom",
    variant: "Double Cab",
    price: 329,
    manufacturer: "Ford",
    logoText: "FD",
    href: "/vans/ford-transit-custom",
    carImageUrl: "/images/car-placeholder.webp",
  },
];

// Promo advert card component
interface PromoCardProps {
  vehicle: {
    id: string;
    model: string;
    variant: string;
    price: number;
    manufacturer: string;
    href?: string;
    logoText?: string;
    logoUrl?: string;
    carImageUrl?: string;
  };
}

function PromoCard({ vehicle }: PromoCardProps) {
  const href = vehicle.href || `/cars/${vehicle.id}`;
  const logoFallback = vehicle.logoText || vehicle.manufacturer.slice(0, 2).toUpperCase();
  const carImage = vehicle.carImageUrl || "/images/car-placeholder.webp";

  return (
    <a
      href={href}
      className="group relative flex h-[176px] w-[360px] shrink-0 items-center overflow-visible rounded-tl-[5px] rounded-tr-[20px] rounded-br-[5px] rounded-bl-[20px] bg-[#222732] transition-transform hover:scale-[1.02]"
    >
      <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
        {vehicle.logoUrl ? (
          <img
            src={vehicle.logoUrl}
            alt={`${vehicle.manufacturer} logo`}
            className="h-8 w-8 object-contain"
          />
        ) : (
          <span className="text-xs font-extrabold tracking-wide text-white/80">{logoFallback}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center gap-4 pl-4 pr-2">
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h3 className="font-black text-2xl text-white/80 uppercase leading-tight">
              {vehicle.model}
            </h3>
            <p className="mt-1 text-xs font-bold text-white line-clamp-2">
              {vehicle.variant}
            </p>
          </div>
          <div className="text-white">
            <span className="text-sm">from</span>
            <span className="ml-1 text-3xl font-black">£{vehicle.price}</span>
          </div>
        </div>

        <div className="flex h-full w-[120px] items-center justify-center">
          <img
            src={carImage}
            alt={`${vehicle.model} image`}
            className="h-[110px] w-[120px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>

      {/* View Deal Tab */}
      <div className="pointer-events-none absolute right-[-14px] bottom-4 flex items-end">
        <div className="pointer-events-auto flex h-[92px] w-10 items-center justify-center rounded-br-[8px] rounded-tr-[16px] bg-[#00e7dc] border-r border-t border-white/10 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
          <span
            className="whitespace-nowrap text-[11px] font-extrabold text-[#0b2a2b] tracking-wide"
            style={{ writingMode: "vertical-rl", transform: "rotate(0deg)" }}
          >
            VIEW DEAL
          </span>
        </div>
      </div>
    </a>
  );
}

interface VehicleBrowserProps {
  vehicleType?: "car" | "van";
  title?: string;
  subtitle?: string;
}

interface Filters {
  bodyTypes: string[];
  fuelTypes: string[];
  transmissions: string[];
  manufacturers: string[];
  priceRange: { min: number; max: number } | null;
  searchQuery: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function VehicleBrowser({
  vehicleType = "car",
  title,
  subtitle,
}: VehicleBrowserProps) {
  const displayTitle = title || (vehicleType === "van" ? "Van Leasing Deals" : "Car Leasing Deals");
  const displaySubtitle = subtitle || (vehicleType === "van"
    ? "Find the perfect commercial vehicle for your business"
    : "Find your perfect lease deal");

  // API state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<Filters>({
    bodyTypes: [],
    fuelTypes: [],
    transmissions: [],
    manufacturers: [],
    priceRange: null,
    searchQuery: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "name">("price-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["bodyType", "fuelType", "price"])
  );
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  const computeColumns = useCallback(() => {
    if (viewMode === "list") return 1;
    if (typeof window === "undefined") return 1;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }, [viewMode]);

  useEffect(() => {
    const updateColumns = () => setColumns(computeColumns());
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [computeColumns]);

  // Fetch vehicles from API
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", pagination.page.toString());
        params.set("limit", pagination.limit.toString());
        params.set("sortBy", sortBy);

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }
        if (filters.fuelTypes.length === 1) {
          params.set("fuelType", filters.fuelTypes[0]);
        }
        if (filters.bodyTypes.length === 1) {
          params.set("bodyType", filters.bodyTypes[0]);
        }
        if (filters.transmissions.length === 1) {
          params.set("transmission", filters.transmissions[0]);
        }
        if (filters.manufacturers.length === 1) {
          params.set("manufacturer", filters.manufacturers[0]);
        }
        if (filters.priceRange) {
          params.set("minPrice", filters.priceRange.min.toString());
          params.set("maxPrice", filters.priceRange.max.toString());
        }

        const response = await fetch(`/api/vehicles?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch vehicles");
        }

        const data = await response.json();
        setVehicles(data.vehicles);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setVehicles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, [pagination.page, pagination.limit, sortBy, debouncedSearch, filters.fuelTypes, filters.bodyTypes, filters.transmissions, filters.manufacturers, filters.priceRange]);

  // Get unique manufacturers from vehicles (for filter options)
  const manufacturers = useMemo(() => {
    const mfrs = new Set(vehicles.map((v) => v.manufacturer));
    return Array.from(mfrs).sort();
  }, [vehicles]);

  // Client-side filtering for multi-select filters (API only supports single values)
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Apply multi-select filters client-side
    if (filters.bodyTypes.length > 1) {
      result = result.filter((v) =>
        filters.bodyTypes.some(bt => v.bodyType?.toLowerCase().includes(bt.toLowerCase()))
      );
    }
    if (filters.fuelTypes.length > 1) {
      result = result.filter((v) =>
        filters.fuelTypes.some(ft => v.fuelType?.toLowerCase().includes(ft.toLowerCase()))
      );
    }
    if (filters.transmissions.length > 1) {
      result = result.filter((v) =>
        filters.transmissions.some(t => v.transmission?.toLowerCase().includes(t.toLowerCase()))
      );
    }
    if (filters.manufacturers.length > 1) {
      result = result.filter((v) =>
        filters.manufacturers.includes(v.manufacturer)
      );
    }

    return result;
  }, [vehicles, filters]);

  useEffect(() => {
    if (expandedVehicleId && !filteredVehicles.some((v) => v.id === expandedVehicleId)) {
      setExpandedVehicleId(null);
    }
  }, [expandedVehicleId, filteredVehicles]);

  const handleToggleExpand = useCallback((id: string | null) => {
    setExpandedVehicleId(id);
  }, []);

  const vehicleRows = useMemo(() => {
    return buildVehicleRows(filteredVehicles, columns, expandedVehicleId);
  }, [filteredVehicles, columns, expandedVehicleId]);

  const vehicleIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredVehicles.forEach((v, idx) => map.set(v.id, idx));
    return map;
  }, [filteredVehicles]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleFilter = useCallback(
    (filterType: keyof Omit<Filters, "priceRange" | "searchQuery">, value: string) => {
      setFilters((prev) => {
        const current = prev[filterType] as string[];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [filterType]: updated };
      });
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters({
      bodyTypes: [],
      fuelTypes: [],
      transmissions: [],
      manufacturers: [],
      priceRange: null,
      searchQuery: "",
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters =
    filters.bodyTypes.length > 0 ||
    filters.fuelTypes.length > 0 ||
    filters.transmissions.length > 0 ||
    filters.manufacturers.length > 0 ||
    filters.priceRange !== null;

  const activeFilterCount =
    filters.bodyTypes.length +
    filters.fuelTypes.length +
    filters.transmissions.length +
    filters.manufacturers.length +
    (filters.priceRange ? 1 : 0);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Render filter checkbox
  const renderFilterOption = (
    filterType: keyof Omit<Filters, "priceRange" | "searchQuery">,
    value: string,
    count?: number
  ) => {
    const isSelected = (filters[filterType] as string[]).includes(value);
    return (
      <button
        key={value}
        onClick={() => toggleFilter(filterType, value)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
          isSelected
            ? "bg-cyan-500/20 text-white"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
            isSelected ? "border-cyan-500 bg-cyan-500" : "border-white/30"
          }`}
        >
          {isSelected && <Check size={12} className="text-black" />}
        </span>
        <span className="flex-1 text-left">{value}</span>
        {count !== undefined && (
          <span className="text-xs text-white/40">({count})</span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.dark }}>
      {/* Header */}
      <div
        className="border-b border-white/10 px-4 py-8 md:px-6 lg:px-8"
        style={{
          background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.darkMid} 100%)`,
        }}
      >
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-white md:text-4xl">{displayTitle}</h1>
          <p className="mt-2 text-white/60">{displaySubtitle}</p>
        </div>
      </div>

      {/* Featured Offers */}
      <div
        className="border-b border-white/10 px-4 py-6 md:px-6 lg:px-8"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Special offers</p>
              <h2 className="text-lg font-semibold text-white">Hand-picked deals for you</h2>
            </div>
            <span className="text-xs text-white/50">Swipe to explore</span>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide pr-2">
            {SPECIAL_OFFERS.map((offer) => (
              <PromoCard key={offer.id} vehicle={offer} />
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="sticky top-[88px] z-30 border-b border-white/10 lg:top-[104px]"
        style={{ backgroundColor: `${colors.darkMid}f5`, backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
          {/* Search */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search make, model..."
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Toggle & Sort */}
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all lg:hidden ${
                isFilterOpen
                  ? "border-cyan-500 bg-cyan-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:text-white"
              }`}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="price-asc" className="bg-gray-900">
                Price: Low to High
              </option>
              <option value="price-desc" className="bg-gray-900">
                Price: High to Low
              </option>
              <option value="name" className="bg-gray-900">
                Name: A-Z
              </option>
            </select>

            {/* View Mode Toggle */}
            <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 md:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-2 transition-all ${
                  viewMode === "grid" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-2 transition-all ${
                  viewMode === "list" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Results Count */}
            <p className="hidden text-sm text-white/60 lg:block">
              <span className="font-semibold text-white">{filteredVehicles.length}</span> vehicles
            </p>
          </div>
        </div>

        {/* Active Filters Pills */}
        {hasActiveFilters && (
          <div className="mx-auto max-w-7xl px-4 pb-3 md:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
              {filters.bodyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter("bodyTypes", type)}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {type}
                  <X size={12} />
                </button>
              ))}
              {filters.fuelTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter("fuelTypes", type)}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {type}
                  <X size={12} />
                </button>
              ))}
              {filters.transmissions.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter("transmissions", type)}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {type}
                  <X size={12} />
                </button>
              ))}
              {filters.manufacturers.map((mfr) => (
                <button
                  key={mfr}
                  onClick={() => toggleFilter("manufacturers", mfr)}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {mfr}
                  <X size={12} />
                </button>
              ))}
              {filters.priceRange && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, priceRange: null }))}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  {PRICE_RANGES.find(
                    (r) =>
                      r.min === filters.priceRange?.min && r.max === filters.priceRange?.max
                  )?.label || "Custom Price"}
                  <X size={12} />
                </button>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs font-medium text-white/50 hover:text-white"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div
              className="sticky top-[200px] rounded-2xl border border-white/10 p-4"
              style={{ backgroundColor: colors.darkMid }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-medium hover:text-white"
                    style={{ color: colors.accent }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Body Type */}
              <div className="border-b border-white/10 py-4">
                <button
                  onClick={() => toggleSection("bodyType")}
                  className="flex w-full items-center justify-between text-sm font-medium text-white"
                >
                  Body Type
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has("bodyType") ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSections.has("bodyType") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-1 overflow-hidden"
                    >
                      {BODY_TYPES.map((type) => renderFilterOption("bodyTypes", type))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fuel Type */}
              <div className="border-b border-white/10 py-4">
                <button
                  onClick={() => toggleSection("fuelType")}
                  className="flex w-full items-center justify-between text-sm font-medium text-white"
                >
                  Fuel Type
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has("fuelType") ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSections.has("fuelType") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-1 overflow-hidden"
                    >
                      {FUEL_TYPES.map((type) => renderFilterOption("fuelTypes", type))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Transmission */}
              <div className="border-b border-white/10 py-4">
                <button
                  onClick={() => toggleSection("transmission")}
                  className="flex w-full items-center justify-between text-sm font-medium text-white"
                >
                  Transmission
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has("transmission") ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSections.has("transmission") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-1 overflow-hidden"
                    >
                      {TRANSMISSIONS.map((type) => renderFilterOption("transmissions", type))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Manufacturer */}
              <div className="border-b border-white/10 py-4">
                <button
                  onClick={() => toggleSection("manufacturer")}
                  className="flex w-full items-center justify-between text-sm font-medium text-white"
                >
                  Manufacturer
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has("manufacturer") ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSections.has("manufacturer") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 max-h-48 space-y-1 overflow-y-auto overflow-hidden"
                    >
                      {manufacturers.map((mfr) => renderFilterOption("manufacturers", mfr))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Price Range */}
              <div className="py-4">
                <button
                  onClick={() => toggleSection("price")}
                  className="flex w-full items-center justify-between text-sm font-medium text-white"
                >
                  Monthly Price
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      expandedSections.has("price") ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedSections.has("price") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-1 overflow-hidden"
                    >
                      {PRICE_RANGES.map((range) => {
                        const isSelected =
                          filters.priceRange?.min === range.min &&
                          filters.priceRange?.max === range.max;
                        return (
                          <button
                            key={range.label}
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                priceRange: isSelected ? null : { min: range.min, max: range.max },
                              }))
                            }
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                              isSelected
                                ? "bg-cyan-500/20 text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                                isSelected ? "border-cyan-500 bg-cyan-500" : "border-white/30"
                              }`}
                            >
                              {isSelected && <Check size={10} className="text-black" />}
                            </span>
                            {range.label}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {isFilterOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFilterOpen(false)}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 30 }}
                  className="fixed bottom-0 left-0 top-0 z-50 w-80 overflow-y-auto lg:hidden"
                  style={{ backgroundColor: colors.darkMid }}
                >
                  <div className="sticky top-0 flex items-center justify-between border-b border-white/10 p-4">
                    <h3 className="text-lg font-bold text-white">Filters</h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    {/* Same filter content as sidebar */}
                    {/* Body Type */}
                    <div className="border-b border-white/10 py-4">
                      <button
                        onClick={() => toggleSection("bodyType")}
                        className="flex w-full items-center justify-between text-sm font-medium text-white"
                      >
                        Body Type
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            expandedSections.has("bodyType") ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedSections.has("bodyType") && (
                        <div className="mt-3 space-y-1">
                          {BODY_TYPES.map((type) => renderFilterOption("bodyTypes", type))}
                        </div>
                      )}
                    </div>
                    {/* Add other filter sections similarly */}
                  </div>
                  <div className="sticky bottom-0 border-t border-white/10 bg-inherit p-4">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full rounded-lg py-3 text-sm font-semibold text-black"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Show {filteredVehicles.length} Results
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Vehicle Grid */}
          <main className="flex-1">
            {/* Loading State */}
            {isLoading ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl py-20"
                style={{ backgroundColor: colors.darkMid }}
              >
                <Loader2 size={48} className="mb-4 animate-spin text-white/50" />
                <h3 className="text-lg font-semibold text-white">Loading vehicles...</h3>
              </div>
            ) : error ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl py-20"
                style={{ backgroundColor: colors.darkMid }}
              >
                <SlidersHorizontal size={48} className="mb-4 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Error loading vehicles</h3>
                <p className="mt-2 text-sm text-white/60">{error}</p>
                <button
                  onClick={() => setPagination(prev => ({ ...prev }))}
                  className="mt-4 rounded-lg px-6 py-2 text-sm font-medium text-black"
                  style={{ backgroundColor: colors.accent }}
                >
                  Try Again
                </button>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl py-20"
                style={{ backgroundColor: colors.darkMid }}
              >
                <SlidersHorizontal size={48} className="mb-4 text-white/30" />
                <h3 className="text-lg font-semibold text-white">No vehicles found</h3>
                <p className="mt-2 text-sm text-white/60">
                  Try adjusting your filters or search query
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 rounded-lg px-6 py-2 text-sm font-medium text-black"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {vehicleRows.map((row, rowIndex) => (
                    <motion.div
                      key={`row-${rowIndex}-${row.map((v) => v.id).join("-")}`}
                      layout
                      className="grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${viewMode === "grid" ? columns : 1}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((vehicle) => (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          index={vehicleIndexMap.get(vehicle.id) ?? 0}
                          onWishlistToggle={toggleWishlist}
                          isWishlisted={wishlist.has(vehicle.id)}
                          isExpanded={expandedVehicleId === vehicle.id}
                          onToggleExpand={handleToggleExpand}
                          columns={columns}
                        />
                      ))}
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                            pagination.page === pageNum
                              ? "text-black"
                              : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                          style={{
                            backgroundColor:
                              pagination.page === pageNum ? colors.accent : undefined,
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <span className="ml-4 text-sm text-white/60">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
