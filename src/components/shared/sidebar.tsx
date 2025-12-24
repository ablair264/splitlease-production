"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Sparkles,
  Upload,
  Sliders,
  Car,
  Link2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { User } from "next-auth";
import { useState } from "react";

type SidebarProps = {
  user: User;
};

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type NavSection = {
  name: string;
  label: string;
  items: NavItem[];
};

// Navigation structure per UX design spec
const navigation: NavSection[] = [
  {
    name: "pricing",
    label: "PRICING",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Rate Explorer", href: "/admin/rates", icon: Search },
      { name: "Deal Finder", href: "/admin/deals", icon: Sparkles },
      { name: "Import Manager", href: "/admin/imports", icon: Upload },
      { name: "Scoring Config", href: "/admin/scoring", icon: Sliders },
    ],
  },
  {
    name: "providers",
    label: "PROVIDERS",
    items: [
      { name: "Lex Autolease", href: "/admin/lex-autolease", icon: Building2 },
      { name: "Lex Playwright", href: "/admin/lex-playwright", icon: Zap },
      { name: "Ogilvie Fleet", href: "/admin/ogilvie", icon: Building2 },
      { name: "Venus/Drivalia", href: "/admin/uploader", icon: FileSpreadsheet },
      { name: "Terms Holders", href: "/admin/fleet-marque", icon: FileSpreadsheet },
    ],
  },
  {
    name: "data",
    label: "DATA",
    items: [
      { name: "Vehicles", href: "/admin/vehicles", icon: Car },
      { name: "CAP Matching", href: "/admin/matching", icon: Link2 },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "bg-[#161c24] flex flex-col h-full transition-all duration-300 ease-in-out relative z-20 shrink-0",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-10 bg-[#79d5e9] text-white p-1 rounded-full shadow-lg hover:bg-[#4daeac] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#79d5e9] z-50 border-2 border-[#161c24]"
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4 text-[#161c24]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#161c24]" />
        )}
      </button>

      {/* Logo Section */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-gray-800/50">
        <Link href="/admin/dashboard" className="flex items-center">
          {isExpanded ? (
            <Image
              src="/images/logo.webp"
              alt="SplitLease Logo"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#79d5e9] to-[#4daeac] flex items-center justify-center">
              <span className="text-[#161c24] font-bold text-lg">S</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 admin-scrollbar">
        {navigation.map((section, sectionIndex) => (
          <div key={section.name}>
            {/* Section Label */}
            {isExpanded ? (
              <div
                className={cn(
                  "px-3 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider",
                  sectionIndex > 0 && "mt-6"
                )}
              >
                {section.label}
              </div>
            ) : (
              sectionIndex > 0 && <div className="h-4" />
            )}

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                      active
                        ? "text-white bg-[#79d5e9]/10 border border-[#79d5e9]/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                    title={!isExpanded ? item.name : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-[#79d5e9]" : "group-hover:text-[#79d5e9]"
                      )}
                    />
                    {isExpanded && (
                      <>
                        <span className="ml-3 whitespace-nowrap">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="ml-auto bg-[#79d5e9] text-[#161c24] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 bg-[#161c24] border-t border-gray-800">
        <div className="flex items-center w-full group">
          <div className="relative shrink-0">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center border-2 border-transparent group-hover:border-[#79d5e9] transition-colors"
              style={{
                background: "linear-gradient(135deg, #79d5e9, #4daeac)",
              }}
            >
              <span className="font-semibold text-[#161c24] text-sm">
                {user.name?.[0]?.toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "?"}
              </span>
            </div>
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-[#161c24] bg-[#4d9869]" />
          </div>
          {isExpanded && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
        </div>

        <form action="/api/auth/signout" method="POST" className="mt-3">
          <button
            type="submit"
            className={cn(
              "flex items-center w-full py-2 rounded-lg text-xs font-medium transition-all duration-200",
              isExpanded ? "justify-center gap-2 px-3" : "justify-center px-2",
              "text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
            )}
            title={!isExpanded ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isExpanded && <span>Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
