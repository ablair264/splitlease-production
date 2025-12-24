"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Table,
  Loader2,
} from "lucide-react";
import { MarketSummaryTab } from "./MarketSummaryTab";
import { CompetitorDealsTab } from "./CompetitorDealsTab";
import { IntelligenceChat } from "./IntelligenceChat";

interface SplitIntelligencePanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabId;
  mode?: "full" | "chat";
}

type TabId = "summary" | "deals" | "chat";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Summary", icon: BarChart3 },
  { id: "deals", label: "Competitor Deals", icon: Table },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

export function SplitIntelligencePanel({
  isOpen,
  onClose,
  initialTab = "summary",
  mode = "full",
}: SplitIntelligencePanelProps) {
  const resolvedInitialTab = mode === "chat" ? "chat" : initialTab;
  const [activeTab, setActiveTab] = useState<TabId>(resolvedInitialTab);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [fetchResult, setFetchResult] = useState<Record<string, number> | null>(
    null
  );
  const isChatOnly = mode === "chat";

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolvedInitialTab);
    }
  }, [isOpen, resolvedInitialTab]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Fetch market data
  const handleFetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/admin/intelligence/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: [
            "leasing_com",
            "leaseloco",
            "appliedleasing",
            "selectcarleasing",
            "vipgateway",
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastFetchTime(new Date());
        const counts: Record<string, number> = {};
        data.results.forEach((result: { source: string; dealsCount: number }) => {
          counts[result.source] = result.dealsCount;
        });
        setFetchResult(counts);
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Format relative time
  const getRelativeTime = (date: Date | null): string => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 flex flex-col"
            style={{ background: "#0f1419" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ background: "rgba(121, 213, 233, 0.15)" }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: "#79d5e9" }} />
                </div>
                <div>
                  <h2
                    id="panel-title"
                    className="text-lg font-semibold text-white"
                  >
                    AI Assistant
                  </h2>
                  {!isChatOnly && (
                    <p className="text-xs text-white/50">
                      Last fetch: {getRelativeTime(lastFetchTime)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isChatOnly && (
                  <button
                    onClick={handleFetchData}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(121, 213, 233, 0.15)",
                      color: "#79d5e9",
                      border: "1px solid rgba(121, 213, 233, 0.3)",
                    }}
                  >
                    {isFetching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Fetch Data
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            {!isChatOnly && (
              <div
                className="flex border-b px-6"
                style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
                role="tablist"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`tabpanel-${tab.id}`}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        isActive
                          ? "border-[#79d5e9] text-[#79d5e9]"
                          : "border-transparent text-white/60 hover:text-white/80"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {isChatOnly ? (
                <IntelligenceChat />
              ) : (
                <>
                  <div
                    id="tabpanel-summary"
                    role="tabpanel"
                    aria-labelledby="tab-summary"
                    hidden={activeTab !== "summary"}
                    className="h-full overflow-y-auto"
                  >
                    {activeTab === "summary" && (
                      <MarketSummaryTab fetchResult={fetchResult} />
                    )}
                  </div>

                  <div
                    id="tabpanel-deals"
                    role="tabpanel"
                    aria-labelledby="tab-deals"
                    hidden={activeTab !== "deals"}
                    className="h-full overflow-y-auto"
                  >
                    {activeTab === "deals" && <CompetitorDealsTab />}
                  </div>

                  <div
                    id="tabpanel-chat"
                    role="tabpanel"
                    aria-labelledby="tab-chat"
                    hidden={activeTab !== "chat"}
                    className="h-full"
                  >
                    {activeTab === "chat" && <IntelligenceChat />}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
