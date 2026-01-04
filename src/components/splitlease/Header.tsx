"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Phone,
  Menu,
  X,
  ArrowRight,
  Car,
  Truck,
  Zap,
  Clock,
  HelpCircle,
  Info,
  MessageCircle,
  BatteryCharging,
} from "lucide-react";
import VoiceCallButton from "./VoiceCallButton";

// Color scheme matching LandingPage.tsx
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9", // cyan
  accentOrange: "#f77d11", // orange
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
};

// Mega menu data structures
interface MegaMenuItem {
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
}

interface MegaMenuSection {
  title: string;
  items: MegaMenuItem[];
}

interface NavigationItem {
  label: string;
  href?: string;
  megaMenu?: MegaMenuSection[];
  icon?: React.ReactNode;
}

// Cars mega menu
const carsMegaMenu: MegaMenuSection[] = [
  {
    title: "By Body Type",
    items: [
      { label: "Hatchback", href: "/cars?bodyType=hatchback" },
      { label: "Saloon", href: "/cars?bodyType=saloon" },
      { label: "Estate", href: "/cars?bodyType=estate" },
      { label: "SUV", href: "/cars?bodyType=suv" },
      { label: "Coupe", href: "/cars?bodyType=coupe" },
      { label: "Convertible", href: "/cars?bodyType=convertible" },
    ],
  },
  {
    title: "By Fuel Type",
    items: [
      { label: "Electric", href: "/cars?fuelType=electric" },
      { label: "Hybrid", href: "/cars?fuelType=hybrid" },
      { label: "Petrol", href: "/cars?fuelType=petrol" },
      { label: "Diesel", href: "/cars?fuelType=diesel" },
    ],
  },
  {
    title: "Popular Brands",
    items: [
      { label: "BMW", href: "/cars?manufacturer=bmw" },
      { label: "Mercedes-Benz", href: "/cars?manufacturer=mercedes-benz" },
      { label: "Audi", href: "/cars?manufacturer=audi" },
      { label: "Volkswagen", href: "/cars?manufacturer=volkswagen" },
      { label: "Tesla", href: "/cars?manufacturer=tesla" },
      { label: "All Brands", href: "/cars" },
    ],
  },
];

// Vans mega menu
const vansMegaMenu: MegaMenuSection[] = [
  {
    title: "By Size",
    items: [
      { label: "Small Vans", href: "/vans?size=small" },
      { label: "Medium Vans", href: "/vans?size=medium" },
      { label: "Large Vans", href: "/vans?size=large" },
      { label: "Pickup Trucks", href: "/vans?bodyType=pickup" },
    ],
  },
  {
    title: "By Use",
    items: [
      { label: "Delivery Vans", href: "/vans?use=delivery" },
      { label: "Crew Vans", href: "/vans?use=crew" },
      { label: "Refrigerated", href: "/vans?use=refrigerated" },
      { label: "Tippers", href: "/vans?use=tipper" },
    ],
  },
  {
    title: "Popular Brands",
    items: [
      { label: "Ford", href: "/vans?manufacturer=ford" },
      { label: "Mercedes-Benz", href: "/vans?manufacturer=mercedes-benz" },
      { label: "Volkswagen", href: "/vans?manufacturer=volkswagen" },
      { label: "All Vans", href: "/vans" },
    ],
  },
];

// What is Leasing mega menu
const leasingMegaMenu: MegaMenuSection[] = [
  {
    title: "Guides",
    items: [
      {
        label: "Personal Leasing Guide",
        href: "/leasing/personal",
        description: "Learn how personal car leasing works",
      },
      {
        label: "Business Leasing Guide",
        href: "/leasing/business",
        description: "Compare business leasing options",
      },
      {
        label: "FAQs",
        href: "/faqs",
        description: "Answers to common leasing questions",
      },
    ],
  },
];

// Help mega menu
const helpMegaMenu: MegaMenuSection[] = [
  {
    title: "Support",
    items: [
      { label: "Contact Us", href: "/contact" },
      { label: "Live Chat", href: "/chat" },
      { label: "Request a Callback", href: "/callback" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "FAQs", href: "/faqs" },
      { label: "Guides & Articles", href: "/guides" },
      { label: "Glossary", href: "/glossary" },
    ],
  },
];

const navigationItems: NavigationItem[] = [
  { label: "Cars", href: "/cars", megaMenu: carsMegaMenu, icon: <Car size={18} /> },
  { label: "Vans", href: "/vans", megaMenu: vansMegaMenu, icon: <Truck size={18} /> },
  { label: "Salary Sacrifice", href: "/salary-sacrifice", icon: <BatteryCharging size={18} /> },
  { label: "Special Offers", href: "/special-offers", icon: <Zap size={18} /> },
  { label: "Quick Delivery", href: "/quick-delivery", icon: <Clock size={18} /> },
  { label: "What is Leasing?", megaMenu: leasingMegaMenu, icon: <Info size={18} /> },
  { label: "Help", megaMenu: helpMegaMenu, icon: <HelpCircle size={18} /> },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<"center" | "left" | "right">("center");
  const headerRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setActiveMegaMenu(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Calculate menu position based on nav item location
  const calculateMenuPosition = (label: string) => {
    const navItem = navItemRefs.current.get(label);
    if (!navItem) return;

    const rect = navItem.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const menuWidth = 896; // max-w-4xl = 56rem = 896px

    const itemCenter = rect.left + rect.width / 2;
    const spaceOnRight = windowWidth - itemCenter;
    const spaceOnLeft = itemCenter;

    if (spaceOnRight < menuWidth / 2 + 32) {
      // Not enough space on right, align to right
      setMenuPosition("right");
    } else if (spaceOnLeft < menuWidth / 2 + 32) {
      // Not enough space on left, align to left
      setMenuPosition("left");
    } else {
      setMenuPosition("center");
    }
  };

  const renderMegaMenu = (sections: MegaMenuSection[], parentLabel: string) => {
    const positionClasses = {
      center: "left-1/2 -translate-x-1/2",
      left: "left-0",
      right: "right-0",
    };

    return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`absolute top-full z-50 w-screen max-w-4xl pt-4 ${positionClasses[menuPosition]}`}
      onMouseEnter={() => setActiveMegaMenu(parentLabel)}
      onMouseLeave={() => setActiveMegaMenu(null)}
    >
      <div
        className="rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, ${colors.darkMid}f0 0%, ${colors.dark}f5 100%)`,
        }}
      >
        <div className="grid grid-cols-3 gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h3
                className="mb-4 text-xs font-bold uppercase tracking-wider"
                style={{ color: colors.accent }}
              >
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/80 transition-all hover:bg-white/5 hover:text-white"
                    >
                      <div>
                        <span className="block font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-white/50">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ArrowRight
                        size={14}
                        className="opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                        style={{ color: colors.accent }}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Featured section for Cars/Vans */}
        {(parentLabel === "Cars" || parentLabel === "Vans") && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  Not sure what you need?
                </p>
                <p className="text-xs text-white/60">
                  Use our smart search to find your perfect vehicle
                </p>
              </div>
              <Link
                href={parentLabel === "Cars" ? "/cars" : "/vans"}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition-all hover:scale-105"
                style={{ backgroundColor: colors.accent }}
              >
                Browse All {parentLabel}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );};

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "shadow-xl" : ""
        }`}
        style={{
          backgroundColor: isScrolled ? `${colors.dark}f5` : colors.dark,
          backdropFilter: isScrolled ? "blur(12px)" : "none",
        }}
      >
        {/* Top bar with phone number */}
        <div
          className="border-b border-white/5"
          style={{ backgroundColor: `${colors.darkMid}80` }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
            <p className="text-xs text-white/60">
              Business & Personal Leasing | UK Delivery
            </p>
            <a
              href="tel:01905686887"
              className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white"
              style={{ color: colors.accent }}
            >
              <Phone size={14} />
              01905 686887
            </a>
          </div>
        </div>

        {/* Main header */}
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <img
                src="/images/logo.webp"
                alt="SplitLease"
                className="h-10 w-auto lg:h-12"
                onError={(e) => {
                  // Fallback to text if image fails
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const textLogo = document.createElement("span");
                    textLogo.textContent = "SplitLease";
                    textLogo.className =
                      "text-2xl font-bold tracking-tight";
                    textLogo.style.color = colors.accent;
                    parent.appendChild(textLogo);
                  }
                }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex lg:flex-1 lg:justify-center">
              <ul className="flex items-center gap-1">
                {navigationItems.map((item) => (
                  <li
                    key={item.label}
                    className="relative"
                    ref={(el) => {
                      if (el) navItemRefs.current.set(item.label, el);
                    }}
                    onMouseEnter={() => {
                      if (item.megaMenu) {
                        calculateMenuPosition(item.label);
                        setActiveMegaMenu(item.label);
                      }
                    }}
                    onMouseLeave={() => setActiveMegaMenu(null)}
                  >
                    {item.href && !item.megaMenu ? (
                      <Link
                        href={item.href}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-white/5 ${
                          activeMegaMenu === item.label
                            ? "bg-white/5 text-white"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        {item.label}
                        {item.megaMenu && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${
                              activeMegaMenu === item.label ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                    )}

                    {/* Mega Menu */}
                    <AnimatePresence>
                      {item.megaMenu && activeMegaMenu === item.label && (
                        renderMegaMenu(item.megaMenu, item.label)
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Right side - Voice Assistant CTA */}
            <div className="hidden items-center gap-3 lg:flex">
              <a
                href="tel:01905686887"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white"
              >
                <Phone size={16} />
                01905 686887
              </a>
              <VoiceCallButton
                variant="header"
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-black transition-all hover:scale-105 hover:shadow-lg"
                style={{
                  backgroundColor: colors.accent,
                  boxShadow: `0 4px 20px ${colors.accent}40`,
                }}
              />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: `${colors.dark}f8`, top: "88px" }}
          >
            <div className="h-full overflow-y-auto pb-20">
              <nav className="mx-auto max-w-lg px-4 py-6">
                <ul className="space-y-2">
                  {navigationItems.map((item) => (
                    <li key={`mobile-${item.label}`}>
                      {item.megaMenu ? (
                        <div>
                          <button
                            onClick={() =>
                              setMobileSubmenuOpen(
                                mobileSubmenuOpen === item.label
                                  ? null
                                  : item.label
                              )
                            }
                            className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-white/5"
                          >
                            <span className="flex items-center gap-3">
                              {item.icon}
                              {item.label}
                            </span>
                            <ChevronDown
                              size={20}
                              className={`transition-transform ${
                                mobileSubmenuOpen === item.label
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {mobileSubmenuOpen === item.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-4 px-4 py-4">
                                  {item.megaMenu.map((section) => (
                                    <div key={section.title}>
                                      <p
                                        className="mb-2 text-xs font-bold uppercase tracking-wider"
                                        style={{ color: colors.accent }}
                                      >
                                        {section.title}
                                      </p>
                                      <ul className="space-y-1">
                                        {section.items.map((subItem) => (
                                          <li key={subItem.label}>
                                            <Link
                                              href={subItem.href}
                                              className="block rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                                              onClick={() =>
                                                setIsMobileMenuOpen(false)
                                              }
                                            >
                                              {subItem.label}
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <Link
                          href={item.href || "#"}
                          className="flex items-center gap-3 rounded-xl px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-white/5"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Mobile CTAs */}
                <div className="mt-8 space-y-3 px-4">
                  <VoiceCallButton
                    variant="mobile"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-black transition-all"
                    style={{ backgroundColor: colors.accent }}
                  />
                  <a
                    href="tel:01905686887"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-medium text-white/80 transition-all hover:bg-white/5"
                  >
                    <Phone size={20} />
                    Call 01905 686887
                  </a>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-[88px] lg:h-[104px]" />
    </>
  );
}
