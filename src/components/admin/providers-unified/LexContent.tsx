"use client";

import { useState } from "react";
import { QuotesTable } from "@/components/lex-autolease/quotes-table";
import { RequestsList } from "@/components/lex-autolease/requests-list";
import { AutomationGuide } from "@/components/lex-autolease/automation-guide";
import { QuoteRunner } from "@/components/lex-autolease/quote-runner";
import { Database, History, BookOpen, Car, PlayCircle } from "lucide-react";

type Tab = "quotes" | "history" | "run" | "guide";

export default function LexContent() {
  const [activeTab, setActiveTab] = useState<Tab>("quotes");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "quotes", label: "Saved Quotes", icon: Database },
    { id: "history", label: "Request History", icon: History },
    { id: "run", label: "Run Quotes", icon: PlayCircle },
    { id: "guide", label: "Automation Guide", icon: BookOpen },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(121, 213, 233, 0.15)" }}
          >
            <Car className="h-5 w-5 text-[#79d5e9]" />
          </div>
          <h2 className="text-xl font-semibold text-white">Lex Autolease Quotes</h2>
        </div>
        <p className="text-white/50">
          Automate quote fetching from Lex Autolease and manage saved quotes
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{
          background: "rgba(15, 20, 25, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: activeTab === tab.id ? "rgba(121, 213, 233, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#79d5e9" : "rgba(255, 255, 255, 0.5)"
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "quotes" && (
        <QuotesTable refreshTrigger={refreshKey} />
      )}

      {activeTab === "history" && (
        <RequestsList
          refreshTrigger={refreshKey}
          onRequestDeleted={() => setRefreshKey(k => k + 1)}
        />
      )}

      {activeTab === "run" && (
        <QuoteRunner onQuotesComplete={() => setRefreshKey(k => k + 1)} />
      )}

      {activeTab === "guide" && (
        <AutomationGuide />
      )}
    </div>
  );
}
