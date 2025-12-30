"use client";

import { useState } from "react";
import { UnifiedDealFinder, SmartSuggestions, OfferPerformance } from "@/components/admin/deals";
import { Sparkles, BarChart3, Search, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminDealsPage() {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeTab, setActiveTab] = useState<"finder" | "suggestions" | "performance">("finder");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal Finder</h1>
          <p className="text-white/50 text-sm mt-1">
            Search, filter, and manage vehicle deals
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("finder")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "finder"
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Search className="w-4 h-4" />
            Deal Finder
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "suggestions"
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Suggestions
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "performance"
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Performance
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "finder" && (
        <>
          {/* Collapsible Smart Suggestions Panel */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(26, 31, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">AI Suggestions</span>
                <span className="text-xs text-white/40">High-value deals to feature</span>
              </div>
              {showSuggestions ? (
                <ChevronUp className="w-4 h-4 text-white/50" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/50" />
              )}
            </button>
            {showSuggestions && (
              <div className="border-t border-white/10 p-4">
                <SmartSuggestions />
              </div>
            )}
          </div>

          {/* Main Deal Finder */}
          <UnifiedDealFinder />
        </>
      )}

      {activeTab === "suggestions" && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <SmartSuggestions />
        </div>
      )}

      {activeTab === "performance" && <OfferPerformance />}
    </div>
  );
}
