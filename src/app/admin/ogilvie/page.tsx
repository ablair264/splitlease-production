"use client";

import { useState, useEffect, useCallback } from "react";
import { OgilvieLoginForm } from "@/components/ogilvie/login-form";
import { OgilvieExportForm } from "@/components/ogilvie/export-form";
import { OgilvieExportsTable } from "@/components/ogilvie/exports-table";
import { Download, History, LogIn } from "lucide-react";

type Tab = "export" | "history";

type SessionStatus = {
  valid: boolean;
  message: string;
  expiresAt?: string;
};

export default function OgilviePage() {
  const [activeTab, setActiveTab] = useState<Tab>("export");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const checkSessionStatus = useCallback(async () => {
    setCheckingSession(true);
    try {
      // Use internal proxy route instead of direct Railway call
      const response = await fetch("/api/admin/ogilvie?action=validate");
      const data = await response.json();
      setSessionStatus({
        valid: data.valid,
        message: data.message,
        expiresAt: data.expiresAt,
      });
    } catch {
      setSessionStatus({ valid: false, message: "Could not verify session" });
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    checkSessionStatus();
  }, [checkSessionStatus]);

  const handleExportComplete = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab("history");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "export", label: "Run Export", icon: Download },
    { id: "history", label: "Export History", icon: History },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Ogilvie Fleet Ratebook</h1>
        <p className="text-white/50">
          Export vehicle pricing data from Ogilvie Fleet for different contract terms and mileages
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{
          background: "rgba(15, 20, 25, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: activeTab === tab.id ? "rgba(121, 213, 233, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#79d5e9" : "rgba(255, 255, 255, 0.5)",
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "export" && (
        <div className="space-y-6">
          {/* Login Form */}
          <OgilvieLoginForm
            sessionStatus={checkingSession ? null : sessionStatus}
            onLoginSuccess={() => {}}
            onRefreshStatus={checkSessionStatus}
          />

          {/* Export Form */}
          <OgilvieExportForm
            sessionValid={sessionStatus?.valid ?? false}
            onExportComplete={handleExportComplete}
          />

          {/* Info Box */}
          <div
            className="rounded-xl p-5 border"
            style={{
              background: "rgba(26, 31, 42, 0.4)",
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="flex items-start gap-3">
              <LogIn className="h-5 w-5 text-[#79d5e9] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-white/90 mb-1">About Ogilvie Exports</h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  This tool connects to Ogilvie Fleet to export ratebook data for all available vehicles.
                  Each export downloads approximately 4,000 vehicles with pricing for the selected
                  contract term and mileage combination. The CSV files can be downloaded from the
                  Export History tab.
                </p>
                <ul className="text-xs text-white/40 mt-2 space-y-1">
                  <li>• 24 months / 20,000 miles = 10,000 miles per year</li>
                  <li>• 36 months / 30,000 miles = 10,000 miles per year</li>
                  <li>• 48 months / 40,000 miles = 10,000 miles per year</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <OgilvieExportsTable refreshTrigger={refreshKey} />
      )}
    </div>
  );
}
