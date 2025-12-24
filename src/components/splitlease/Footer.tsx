"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";

// Color scheme matching Header
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
};

const footerLinks = {
  cars: [
    { label: "All Cars", href: "/cars" },
    { label: "Electric Cars", href: "/cars?fuelType=electric" },
    { label: "Hybrid Cars", href: "/cars?fuelType=hybrid" },
    { label: "SUVs", href: "/cars?bodyType=suv" },
    { label: "Saloons", href: "/cars?bodyType=saloon" },
  ],
  vans: [
    { label: "All Vans", href: "/vans" },
    { label: "Small Vans", href: "/vans?size=small" },
    { label: "Medium Vans", href: "/vans?size=medium" },
    { label: "Large Vans", href: "/vans?size=large" },
    { label: "Pickup Trucks", href: "/vans?bodyType=pickup" },
  ],
  leasing: [
    { label: "What is Leasing?", href: "/leasing/how-it-works" },
    { label: "Business vs Personal", href: "/leasing/business-vs-personal" },
    { label: "Lease Calculator", href: "/calculator" },
    { label: "End of Lease", href: "/leasing/end-of-lease" },
    { label: "FAQs", href: "/faqs" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Special Offers", href: "/special-offers" },
    { label: "Quick Delivery", href: "/quick-delivery" },
    { label: "Reviews", href: "/reviews" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative w-full"
      style={{ backgroundColor: colors.dark }}
    >
      {/* Newsletter Section */}
      <div
        className="border-b border-white/10"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h3 className="text-xl font-bold text-white md:text-2xl">
                Get the latest deals
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Subscribe to our newsletter for exclusive offers and leasing tips
              </p>
            </div>
            <form className="flex w-full max-w-md gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-black transition-all hover:scale-105"
                style={{ backgroundColor: colors.accent }}
              >
                Subscribe
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <img
                src="/images/logo.webp"
                alt="SplitLease"
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const textLogo = document.createElement("span");
                    textLogo.textContent = "SplitLease";
                    textLogo.className = "text-2xl font-bold";
                    textLogo.style.color = colors.accent;
                    parent.appendChild(textLogo);
                  }
                }}
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              SplitLease makes vehicle leasing simple. Whether for business or
              personal use, we offer competitive rates on cars and vans with
              transparent pricing.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a
                href="tel:01905686887"
                className="flex items-center gap-3 text-sm text-white/80 transition-colors hover:text-white"
              >
                <Phone size={16} style={{ color: colors.accent }} />
                01905 686887
              </a>
              <a
                href="mailto:hello@splitlease.co.uk"
                className="flex items-center gap-3 text-sm text-white/80 transition-colors hover:text-white"
              >
                <Mail size={16} style={{ color: colors.accent }} />
                hello@splitlease.co.uk
              </a>
              <div className="flex items-start gap-3 text-sm text-white/60">
                <MapPin
                  size={16}
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: colors.accent }}
                />
                <span>Worcester, United Kingdom</span>
              </div>
            </div>
          </div>

          {/* Cars Column */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Cars
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.cars.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Vans Column */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Vans
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.vans.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Leasing Column */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Leasing
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.leasing.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 md:flex-row">
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-wider text-white/40">
              Follow Us
            </span>
            <div className="flex gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms & Conditions
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-white">
              Cookie Policy
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-center text-xs text-white/40">
          <p>&copy; {currentYear} SplitLease. All rights reserved.</p>
          <p className="mt-2">
            SplitLease is a trading name. Authorised and regulated by the Financial
            Conduct Authority.
          </p>
        </div>
      </div>
    </footer>
  );
}
