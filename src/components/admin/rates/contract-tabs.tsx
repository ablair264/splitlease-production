"use client";

import type { ContractTab } from "@/lib/rates/types";
import { TAB_LABELS, TAB_HAS_MAINTENANCE_TOGGLE } from "@/lib/rates/types";

interface ContractTabsProps {
  activeTab: ContractTab;
  withMaintenance: boolean;
  onTabChange: (tab: ContractTab) => void;
  onMaintenanceChange: (withMaintenance: boolean) => void;
}

const TAB_ICONS: Record<ContractTab, React.ReactNode> = {
  "contract-hire": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  "personal-contract-hire": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  "salary-sacrifice": (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function ContractTabs({
  activeTab,
  withMaintenance,
  onTabChange,
  onMaintenanceChange,
}: ContractTabsProps) {
  const tabs: ContractTab[] = ["contract-hire", "personal-contract-hire", "salary-sacrifice"];

  return (
    <div
      className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-2 rounded-xl"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Tab Navigation */}
      <nav
        className="flex gap-1"
        role="tablist"
        aria-label="Contract type"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab}`}
              onClick={() => onTabChange(tab)}
              className={`
                group relative px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 flex items-center gap-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f2a]
                ${isActive
                  ? "text-white shadow-lg"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }
              `}
              style={isActive ? {
                background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)",
                boxShadow: "0 4px 12px rgba(30, 141, 141, 0.3)"
              } : {}}
            >
              <span className={`transition-colors ${isActive ? "text-cyan-200" : "text-white/40 group-hover:text-white/60"}`}>
                {TAB_ICONS[tab]}
              </span>
              <span className="whitespace-nowrap">{TAB_LABELS[tab]}</span>
              {isActive && (
                <span
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Maintenance Toggle - only show for CH and PCH */}
      {TAB_HAS_MAINTENANCE_TOGGLE[activeTab] && (
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(15, 20, 25, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
          role="radiogroup"
          aria-label="Maintenance option"
        >
          <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Maintenance</span>
          <div className="flex gap-1 p-0.5 rounded-md bg-black/20">
            <button
              role="radio"
              aria-checked={withMaintenance}
              onClick={() => onMaintenanceChange(true)}
              className={`
                px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                ${withMaintenance
                  ? "text-white bg-emerald-600/80 shadow-sm"
                  : "text-white/50 hover:text-white/70"
                }
              `}
            >
              Included
            </button>
            <button
              role="radio"
              aria-checked={!withMaintenance}
              onClick={() => onMaintenanceChange(false)}
              className={`
                px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                ${!withMaintenance
                  ? "text-white bg-white/10 shadow-sm"
                  : "text-white/50 hover:text-white/70"
                }
              `}
            >
              Excluded
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
