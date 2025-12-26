"use client";

import { useState } from "react";
import { DrivaliaQuoteRunner } from "@/components/drivalia/quote-runner";
import { DrivaliaQuoteHistory } from "@/components/drivalia/quote-history";
import { Car, PlayCircle, History, BookOpen } from "lucide-react";

type Tab = "run" | "history" | "guide";

export default function DrivaliaPage() {
  const [activeTab, setActiveTab] = useState<Tab>("run");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "run", label: "Run Quotes", icon: PlayCircle },
    { id: "history", label: "Quote History", icon: History },
    { id: "guide", label: "Setup Guide", icon: BookOpen },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(236, 72, 153, 0.15)" }}
          >
            <Car className="h-5 w-5 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Drivalia Quotes</h1>
        </div>
        <p className="text-white/50">
          Automate quote fetching from Drivalia (CAAF Genus) portal
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
              background: activeTab === tab.id ? "rgba(236, 72, 153, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#ec4899" : "rgba(255, 255, 255, 0.5)"
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "run" && (
        <DrivaliaQuoteRunner onQuotesComplete={() => setRefreshKey(k => k + 1)} />
      )}

      {activeTab === "history" && (
        <DrivaliaQuoteHistory refreshTrigger={refreshKey} />
      )}

      {activeTab === "guide" && (
        <div
          className="rounded-xl border p-6 space-y-6"
          style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <h2 className="text-lg font-semibold text-white">Setup Guide</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-white">Install the Browser Extension</p>
                <p className="text-sm text-white/60">
                  Load the extension from <code className="bg-black/30 px-2 py-0.5 rounded text-pink-300">extensions/lex-session-capture</code> in Chrome.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-white">Login to Drivalia Portal</p>
                <p className="text-sm text-white/60">
                  Open{" "}
                  <a
                    href="https://www.caafgenus3.co.uk/WebApp/fmoportal/index.html#/quoting/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:underline"
                  >
                    caafgenus3.co.uk
                  </a>{" "}
                  and login with your credentials.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-white">Navigate to New Quote Page</p>
                <p className="text-sm text-white/60">
                  Make sure you&apos;re on the new quote page before running automation.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-white">Select Vehicles & Run</p>
                <p className="text-sm text-white/60">
                  Choose vehicles here, configure quote settings, and click Run to process via the extension.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
            <p className="text-sm text-pink-300">
              <strong>Note:</strong> Drivalia uses CAP codes for vehicle lookup. Vehicles must have a valid CAP code to run quotes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
