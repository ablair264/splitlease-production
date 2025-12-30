"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: React.ReactNode;
  className?: string;
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

export function Tabs({ tabs, defaultTab, children, className }: TabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = searchParams.get("tab") || defaultTab || tabs[0]?.id;

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab Navigation */}
      <div className="shrink-0 flex items-center gap-1 px-6 py-3 border-b border-white/10 bg-[#0f1419]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function TabPanel({ id, children }: TabPanelProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  // Get parent tabs context to determine default
  // For now, just check if this panel should be shown
  const isVisible = activeTab === id || (!activeTab && id === "explorer"); // Default fallback

  if (!isVisible) return null;

  return <div className="h-full">{children}</div>;
}

// Hook to get active tab
export function useActiveTab(defaultTab: string) {
  const searchParams = useSearchParams();
  return searchParams.get("tab") || defaultTab;
}
