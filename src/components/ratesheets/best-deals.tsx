"use client";

import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";

interface Deal {
  vehicle_id: string;
  cap_code: string | null;
  manufacturer: string;
  model: string;
  variant: string | null;
  fuel_type: string | null;
  transmission: string | null;
  co2: number | null;
  p11d: number | null;
  body_style: string | null;
  insurance_group: number | null;
  best_provider: string;
  best_monthly_rental: number;
  term_months: number | null;
  annual_mileage: number | null;
  best_price_date: string;
  score: number;
  score_category: string;
}

interface Filters {
  manufacturer: string;
  fuelType: string;
  maxMonthly: string;
  minScore: string;
}

interface BestDealsProps {
  onError: (message: string) => void;
}

export function BestDeals({ onError }: BestDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    manufacturer: "",
    fuelType: "",
    maxMonthly: "",
    minScore: "",
  });
  const [totalDeals, setTotalDeals] = useState(0);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);

  const loadBestDeals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.manufacturer) params.append("manufacturer", filters.manufacturer);
      if (filters.fuelType) params.append("fuelType", filters.fuelType);
      if (filters.maxMonthly) params.append("maxMonthly", filters.maxMonthly);
      if (filters.minScore) params.append("minScore", filters.minScore);
      params.append("limit", "100");

      const response = await fetch(`/api/ratesheets/best-deals?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch deals");
      }

      const data = await response.json();

      if (data.deals && data.deals.length > 0) {
        setDeals(data.deals);
        setTotalDeals(data.total);
        setManufacturers(data.manufacturers || []);
        setFuelTypes(data.fuelTypes || []);
      } else {
        setDeals([]);
        setTotalDeals(0);
      }
    } catch (error) {
      console.error("Error loading best deals:", error);
      onError("Could not load best deals. Please check your database connection.");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [filters, onError]);

  // Load initial data
  useEffect(() => {
    loadBestDeals();
  }, [loadBestDeals]);

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      manufacturer: "",
      fuelType: "",
      maxMonthly: "",
      minScore: "",
    });
  };

  const formatCurrency = (value: number | null | undefined, inPence = true) => {
    if (value === null || value === undefined) return "N/A";
    const num = inPence ? value / 100 : value;
    return `£${num.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    return value.toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10B981";
    if (score >= 70) return "#22C55E";
    if (score >= 50) return "#EAB308";
    if (score >= 30) return "#F97316";
    return "#EF4444";
  };

  const downloadCSV = () => {
    if (deals.length === 0) return;

    const headers = [
      "Manufacturer",
      "Model",
      "Variant",
      "CAP Code",
      "Best Monthly Rental",
      "Best Provider",
      "P11D Price",
      "Term (Months)",
      "Annual Mileage",
      "Fuel Type",
      "CO2 Emissions",
      "Score",
      "Score Category",
    ];

    const csvContent = [
      headers.join(","),
      ...deals.map((deal) =>
        [
          deal.manufacturer,
          deal.model,
          deal.variant || "",
          deal.cap_code || "",
          (deal.best_monthly_rental / 100).toFixed(2),
          deal.best_provider,
          deal.p11d ? (deal.p11d / 100).toFixed(0) : "",
          deal.term_months || "",
          deal.annual_mileage || "",
          deal.fuel_type || "",
          deal.co2 || "",
          deal.score || "",
          deal.score_category || "",
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "best-lease-deals.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 animate-spin">🔄</div>
        <p className="text-white/60">Loading best deals from database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span>🏆</span> Best Lease Deals Database
        </h2>
        <p className="text-white/60 text-sm">Aggregated best prices across all providers</p>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-xl"
        style={{ background: "rgba(26, 31, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Manufacturer</label>
            <select
              value={filters.manufacturer}
              onChange={(e) => handleFilterChange("manufacturer", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 text-white text-sm focus:outline-none focus:border-[#79d5e9]"
              style={{ backgroundColor: "#1a1f2a", colorScheme: "dark" }}
            >
              <option value="" style={{ backgroundColor: "#1a1f2a", color: "white" }}>All Manufacturers</option>
              {manufacturers.map((mfr) => (
                <option key={mfr} value={mfr} style={{ backgroundColor: "#1a1f2a", color: "white" }}>
                  {mfr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Fuel Type</label>
            <select
              value={filters.fuelType}
              onChange={(e) => handleFilterChange("fuelType", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 text-white text-sm focus:outline-none focus:border-[#79d5e9]"
              style={{ backgroundColor: "#1a1f2a", colorScheme: "dark" }}
            >
              <option value="" style={{ backgroundColor: "#1a1f2a", color: "white" }}>All Fuel Types</option>
              {fuelTypes.map((fuel) => (
                <option key={fuel} value={fuel} style={{ backgroundColor: "#1a1f2a", color: "white" }}>
                  {fuel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Max Monthly (£)</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={filters.maxMonthly}
              onChange={(e) => handleFilterChange("maxMonthly", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#79d5e9]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Min Score</label>
            <input
              type="number"
              placeholder="e.g. 70"
              value={filters.minScore}
              onChange={(e) => handleFilterChange("minScore", e.target.value)}
              min="0"
              max="100"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#79d5e9]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={clearFilters}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={downloadCSV}
            disabled={deals.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)", color: "#0f1419" }}
          >
            <Download className="w-4 h-4" />
            Download CSV ({totalDeals} deals)
          </button>
        </div>
      </div>

      {/* Results */}
      {deals.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-white mb-2">No deals found</h3>
          <p className="text-white/60">Try adjusting your filters or upload some rate sheets first.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-white/60 mb-4">
            <strong className="text-white">{totalDeals}</strong> best deals found
          </p>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(26, 31, 42, 0.95)" }}>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Vehicle</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Best Monthly</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Provider</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">P11D</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Term/Mileage</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Fuel/CO2</th>
                    <th className="text-left px-4 py-3 text-white/60 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal, index) => (
                    <tr
                      key={deal.vehicle_id || index}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <strong className="text-white">{deal.manufacturer}</strong>
                          <div className="text-white/60">{deal.model}</div>
                          {deal.cap_code && (
                            <div className="text-xs text-white/40">CAP: {deal.cap_code}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-white">{formatCurrency(deal.best_monthly_rental)}</strong>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <strong className="text-white">{deal.best_provider}</strong>
                          <div className="text-xs text-white/40">
                            {new Date(deal.best_price_date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/80">{formatCurrency(deal.p11d)}</td>
                      <td className="px-4 py-3">
                        <div className="text-white/80">{deal.term_months || "N/A"} months</div>
                        <div className="text-white/60">{formatNumber(deal.annual_mileage)} miles/year</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white/80">{deal.fuel_type || "N/A"}</div>
                        {deal.co2 && <div className="text-white/60">{deal.co2}g CO2</div>}
                      </td>
                      <td className="px-4 py-3">
                        {deal.score !== null && (
                          <span
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-sm"
                            style={{ backgroundColor: getScoreColor(deal.score) }}
                          >
                            {Math.round(deal.score)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
