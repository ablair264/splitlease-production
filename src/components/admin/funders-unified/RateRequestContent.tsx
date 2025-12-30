"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, RefreshCw, FileSpreadsheet } from "lucide-react";

interface RateRequest {
  provider: string;
  manufacturer: string;
  model: string;
  capCode: string;
  missingTerms: number[];
  missingMileages: number[];
}

export default function RateRequestContent() {
  const [data, setData] = useState<{ requests: RateRequest[]; totalGaps: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/funders/rate-request");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch rate requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async (provider: string) => {
    setExporting(provider);
    try {
      const res = await fetch(`/api/admin/funders/rate-request?provider=${provider}&format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rate-request-${provider}-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const groupedByProvider = data?.requests.reduce((acc, req) => {
    if (!acc[req.provider]) acc[req.provider] = [];
    acc[req.provider].push(req);
    return acc;
  }, {} as Record<string, RateRequest[]>) || {};

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Rate Requests</h2>
          <p className="text-white/50 text-sm mt-1">
            Export coverage gaps to send to funders for rate quotes
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : Object.keys(groupedByProvider).length === 0 ? (
        <div
          className="p-12 rounded-xl text-center"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <FileSpreadsheet className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Rate Gaps</h3>
          <p className="text-white/50 text-sm">
            All vehicles have complete rate coverage across all funders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByProvider).map(([provider, requests]) => (
            <div
              key={provider}
              className="rounded-xl overflow-hidden"
              style={{
                background: "rgba(26, 31, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div>
                  <h3 className="font-semibold text-white">{provider}</h3>
                  <p className="text-xs text-white/40">{requests.length} vehicles with gaps</p>
                </div>
                <button
                  onClick={() => handleExport(provider)}
                  disabled={exporting === provider}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm disabled:opacity-50"
                >
                  {exporting === provider ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export CSV
                </button>
              </div>
              <div className="p-4">
                <div className="text-sm text-white/60 space-y-1">
                  {requests.slice(0, 5).map((req, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{req.manufacturer} {req.model}</span>
                      <span className="text-white/40 text-xs">{req.capCode}</span>
                    </div>
                  ))}
                  {requests.length > 5 && (
                    <div className="text-white/40 text-xs pt-2">
                      +{requests.length - 5} more vehicles
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
