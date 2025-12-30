"use client";

import { useState } from "react";
import { UnifiedDealFinder, SmartSuggestions } from "@/components/admin/deals";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

export default function DealFinderContent() {
  const [showSuggestions, setShowSuggestions] = useState(true);

  return (
    <div className="space-y-6 p-6 overflow-auto h-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Deal Finder</h2>
        <p className="text-white/50 text-sm mt-1">
          Search, filter, and manage vehicle deals
        </p>
      </div>

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
    </div>
  );
}
