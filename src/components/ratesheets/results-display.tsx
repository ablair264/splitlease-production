"use client";

import { useState } from "react";
import { Download } from "lucide-react";

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
  // Compressed format fields
  m?: string;
  d?: string;
  p?: number;
  v?: number;
  t?: number;
  mi?: number;
  s?: number;
  c?: string;
}

interface UploadStats {
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
}

interface ResultsData {
  success: boolean;
  fileName: string;
  provider: string;
  stats: UploadStats;
  topDeals: VehicleResult[];
  errors: string[];
  testMode: boolean;
}

interface ResultsDisplayProps {
  results: ResultsData;
  onReset: () => void;
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const [currentView, setCurrentView] = useState<"overview" | "top-deals" | "full-data">("overview");
  const [showFullData, setShowFullData] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const downloadCSV = (data: VehicleResult[], filename: string) => {
    if (!data || data.length === 0) return;

    // Convert compressed data back to readable format for CSV
    const expandedData = data.map((item) => {
      if (item.m) {
        // Compressed format
        return {
          Manufacturer: item.m,
          Model: item.d,
          "Monthly Payment": item.p,
          "P11D Value": item.v,
          "Term (months)": item.t,
          Mileage: item.mi,
          Score: item.s,
          Category: item.c,
        };
      }
      return {
        Manufacturer: item.manufacturer,
        Model: item.model,
        Variant: item.variant,
        "Monthly Payment": item.monthly_rental,
        "P11D Value": item.p11d,
        "Term (months)": item.term,
        Mileage: item.mileage,
        Score: item.score,
        Category: item.scoreCategory,
        MPG: item.mpg,
        CO2: item.co2,
      };
    });

    const headers = Object.keys(expandedData[0]);
    const csvContent = [
      headers.join(","),
      ...expandedData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "N/A";
    const num = parseFloat(String(value));
    return isNaN(num) ? "£0" : `£${num.toLocaleString()}`;
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0";
    const num = parseFloat(String(value));
    return isNaN(num) ? "0" : num.toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10B981";
    if (score >= 70) return "#22C55E";
    if (score >= 50) return "#EAB308";
    if (score >= 30) return "#F97316";
    return "#EF4444";
  };

  const { stats, topDeals, fileName } = results;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">🎉 Analysis Complete!</h1>
        <p className="text-white/60">
          Analyzed <strong className="text-white">{formatNumber(stats.totalVehicles)}</strong> vehicles from{" "}
          <strong className="text-white">{fileName}</strong>
        </p>
        {results.testMode && (
          <div
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs"
            style={{ background: "rgba(234, 179, 8, 0.2)", color: "#EAB308" }}
          >
            Test Mode - Only 10 rows processed
          </div>
        )}
        <button
          onClick={onReset}
          className="mt-4 px-6 py-2 rounded-lg text-[#0f1419] font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)" }}
        >
          Analyze New File
        </button>
      </div>

      {/* View Tabs */}
      <div
        className="flex gap-2 p-1 rounded-lg"
        style={{ background: "rgba(26, 31, 42, 0.8)" }}
      >
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "top-deals", label: "🏆 Top Deals" },
          { key: "full-data", label: "📋 All Data" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentView === key ? "text-white" : "text-white/60 hover:text-white"
            }`}
            style={currentView === key ? { background: "#1e8d8d" } : {}}
            onClick={() => setCurrentView(key as typeof currentView)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {currentView === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Vehicles", value: formatNumber(stats.totalVehicles) },
              { label: "Average Score", value: `${stats.averageScore}/100`, color: getScoreColor(stats.averageScore) },
              { label: "Best Deal Score", value: `${stats.topScore}/100`, color: getScoreColor(stats.topScore) },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="p-4 rounded-xl text-center"
                style={{ background: "rgba(26, 31, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              >
                <h3 className="text-white/60 text-sm mb-1">{label}</h3>
                <div className="text-2xl font-bold" style={{ color: color || "#fff" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Score Distribution */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(26, 31, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-semibold mb-4">📈 Score Distribution</h3>
            <div className="space-y-3">
              {Object.entries({
                "Exceptional (90-100)": { count: stats.scoreDistribution.exceptional, color: "#10B981" },
                "Excellent (70-89)": { count: stats.scoreDistribution.excellent, color: "#22C55E" },
                "Good (50-69)": { count: stats.scoreDistribution.good, color: "#EAB308" },
                "Fair (30-49)": { count: stats.scoreDistribution.fair, color: "#F97316" },
                "Poor (0-29)": { count: stats.scoreDistribution.poor, color: "#EF4444" },
              }).map(([label, { count, color }]) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80">{label}</span>
                    <span className="text-white/60">
                      {count} vehicles ({((count / stats.totalVehicles) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / stats.totalVehicles) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Preview */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(26, 31, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-semibold mb-4">🥇 Top 3 Best Deals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topDeals.slice(0, 3).map((vehicle, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg"
                  style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center"
                      style={{ background: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32", color: "#0f1419" }}
                    >
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">
                        {vehicle.manufacturer} {vehicle.model}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/60">{formatCurrency(vehicle.monthly_rental)}/month</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ backgroundColor: getScoreColor(vehicle.score), color: "#fff" }}
                        >
                          {vehicle.score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download Section */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(26, 31, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <h3 className="text-white font-semibold mb-4">📥 Download Results</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => downloadCSV(topDeals.slice(0, 100), "top-100-lease-deals.csv")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)", color: "#0f1419" }}
              >
                <Download className="w-4 h-4" />
                Download Top 100 Deals CSV
              </button>
              <button
                onClick={() => downloadCSV(topDeals, "all-lease-deals-scored.csv")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/5 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Complete Dataset CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Deals Tab */}
      {currentView === "top-deals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">🏆 Top 100 Best Lease Deals</h2>
            <button
              onClick={() => downloadCSV(topDeals.slice(0, 100), "top-100-lease-deals.csv")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)", color: "#0f1419" }}
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr style={{ background: "rgba(26, 31, 42, 0.95)" }}>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Monthly</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">P11D</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">MPG</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">CO2</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeals.slice(0, 100).map((vehicle, index) => (
                    <tr
                      key={index}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                    >
                      <td className="px-4 py-3 text-white/60">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <strong className="text-white">{vehicle.manufacturer}</strong>
                        <div className="text-white/60 text-xs">{vehicle.model}</div>
                      </td>
                      <td className="px-4 py-3 text-white">{formatCurrency(vehicle.monthly_rental)}</td>
                      <td className="px-4 py-3 text-white/80">{formatCurrency(vehicle.p11d)}</td>
                      <td className="px-4 py-3 text-white/80">{formatNumber(vehicle.mpg)}</td>
                      <td className="px-4 py-3 text-white/80">{formatNumber(vehicle.co2)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-xs"
                          style={{ backgroundColor: getScoreColor(vehicle.score) }}
                        >
                          {vehicle.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Full Data Tab */}
      {currentView === "full-data" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              📋 Complete Dataset ({formatNumber(topDeals.length)} vehicles)
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => downloadCSV(topDeals, "all-lease-deals-scored.csv")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)", color: "#0f1419" }}
              >
                <Download className="w-4 h-4" />
                Download All Data CSV
              </button>
              <button
                onClick={() => setShowFullData(!showFullData)}
                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 text-sm hover:text-white hover:bg-white/5 transition-all"
              >
                {showFullData ? "Show Less" : "Show All"}
              </button>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr style={{ background: "rgba(26, 31, 42, 0.95)" }}>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Score</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Monthly</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">P11D</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Term</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Mileage</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {(showFullData ? topDeals : topDeals.slice(0, 50)).map((vehicle, index) => {
                    // Handle compressed format
                    const v = vehicle.m
                      ? {
                          manufacturer: vehicle.m,
                          model: vehicle.d,
                          monthly_rental: vehicle.p,
                          p11d: vehicle.v,
                          score: vehicle.s || 0,
                          term: vehicle.t,
                          mileage: vehicle.mi,
                          scoreCategory: vehicle.c || "",
                        }
                      : vehicle;

                    return (
                      <tr key={index} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-xs"
                            style={{ backgroundColor: getScoreColor(v.score) }}
                          >
                            {v.score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <strong className="text-white">{v.manufacturer}</strong>
                          <div className="text-white/60 text-xs">{v.model}</div>
                        </td>
                        <td className="px-4 py-3 text-white">{formatCurrency(v.monthly_rental)}</td>
                        <td className="px-4 py-3 text-white/80">{formatCurrency(v.p11d)}</td>
                        <td className="px-4 py-3 text-white/80">{v.term || "N/A"} months</td>
                        <td className="px-4 py-3 text-white/80">{formatNumber(v.mileage)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs text-white/80 bg-white/10">
                            {v.scoreCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!showFullData && topDeals.length > 50 && (
            <div className="text-center text-white/60 text-sm">
              Showing 50 of {formatNumber(topDeals.length)} vehicles
              <button
                onClick={() => setShowFullData(true)}
                className="ml-2 text-[#79d5e9] hover:underline"
              >
                Show All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
