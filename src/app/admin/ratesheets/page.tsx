"use client";

import { useState } from "react";
import { FlexibleUpload } from "@/components/ratesheets/flexible-upload";
import { BestDeals } from "@/components/ratesheets/best-deals";
import { ResultsDisplay } from "@/components/ratesheets/results-display";

type Tab = "upload" | "best-deals";

interface VehicleResult {
  manufacturer?: string;
  model?: string;
  variant?: string;
  monthly_rental?: number;
  p11d?: number;
  term?: number;
  mileage?: number;
  score: number;
  scoreCategory: string;
  mpg?: number;
  co2?: number;
  [key: string]: unknown;
}

interface UploadResult {
  success: boolean;
  batchId: string;
  fileName: string;
  provider: string;
  stats: {
    totalVehicles: number;
    averageScore: number;
    topScore: number;
    scoreDistribution: {
      exceptional: number;
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
  };
  topDeals: VehicleResult[];
  errors: string[];
  testMode: boolean;
}

export default function RatesheetsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [error, setError] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);

  const handleUploadComplete = (results: UploadResult) => {
    setUploadResults(results);
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const handleReset = () => {
    setUploadResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rate Sheets</h1>
        <p className="text-white/60 mt-1">
          Upload rate sheets from funders and find the best lease deals
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="p-4 rounded-lg flex items-start gap-3"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <span className="text-red-400">⚠️</span>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      {!uploadResults && (
        <div
          className="flex gap-1 p-1 rounded-lg w-fit"
          style={{ background: "rgba(26, 31, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "upload" ? "text-white" : "text-white/60 hover:text-white"
            }`}
            style={
              activeTab === "upload"
                ? { background: "#1e8d8d" }
                : {}
            }
          >
            📤 Upload Rate Sheet
          </button>
          <button
            onClick={() => setActiveTab("best-deals")}
            className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "best-deals" ? "text-white" : "text-white/60 hover:text-white"
            }`}
            style={
              activeTab === "best-deals"
                ? { background: "#1e8d8d" }
                : {}
            }
          >
            🏆 Best Deals Finder
          </button>
        </div>
      )}

      {/* Content Area */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {uploadResults ? (
          <ResultsDisplay results={uploadResults} onReset={handleReset} />
        ) : activeTab === "upload" ? (
          <FlexibleUpload onUploadComplete={handleUploadComplete} onError={handleError} />
        ) : (
          <BestDeals onError={handleError} />
        )}
      </div>
    </div>
  );
}
