"use client";

import { useState } from "react";
import { ScraperForm } from "@/components/fleet-marque/scraper-form";
import { TermsTable } from "@/components/fleet-marque/terms-table";
import { BatchesList } from "@/components/fleet-marque/batches-list";
import { Database, Play, History } from "lucide-react";

type Tab = "scraper" | "terms" | "history";

export default function FleetMarqueContent() {
  const [activeTab, setActiveTab] = useState<Tab>("terms");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScrapeComplete = () => {
    setRefreshKey(k => k + 1);
    setActiveTab("terms");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "terms", label: "Discount Terms", icon: Database },
    { id: "scraper", label: "Run Scraper", icon: Play },
    { id: "history", label: "Scrape History", icon: History },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Fleet Marque Discounts</h2>
        <p className="text-white/50">
          Import and manage manufacturer discount terms from Fleet Marque
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{
          background: 'rgba(15, 20, 25, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: activeTab === tab.id ? 'rgba(121, 213, 233, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#79d5e9' : 'rgba(255, 255, 255, 0.5)'
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "scraper" && (
        <ScraperForm onComplete={handleScrapeComplete} />
      )}

      {activeTab === "terms" && (
        <TermsTable refreshTrigger={refreshKey} />
      )}

      {activeTab === "history" && (
        <BatchesList
          refreshTrigger={refreshKey}
          onBatchDeleted={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
