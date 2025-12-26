"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trash2, Download, Car, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Quote = {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  term: number;
  mileage: number;
  contractType: string;
  status: string;
  result?: {
    quoteId?: string;
    monthlyRental?: number;
    initialRental?: number;
  };
  error?: string;
  batchId?: string;
  createdAt: string;
};

type QuoteHistoryProps = {
  refreshTrigger?: number;
};

export function DrivaliaQuoteHistory({ refreshTrigger }: QuoteHistoryProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 25;

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drivalia/quote-queue?history=true&limit=100`);
      const data = await response.json();
      setQuotes(data.queue || []);
      setTotalItems(data.queue?.length || 0);
    } catch (err) {
      console.error("Error fetching quote history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [refreshTrigger]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `£${value.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getContractLabel = (type: string) => {
    const labels: Record<string, string> = {
      BCH: "BCH",
      BCHNM: "BCH (NM)",
      PCH: "PCH",
      PCHNM: "PCH (NM)",
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-pink-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const exportToCSV = () => {
    if (quotes.length === 0) return;

    const headers = ["Make", "Model", "Variant", "CAP Code", "Term", "Mileage", "Contract", "Monthly", "Initial", "Status", "Date"];
    const rows = quotes.map(q => [
      q.manufacturer,
      q.model,
      q.variant || "",
      q.capCode || "",
      q.term,
      q.mileage,
      q.contractType,
      q.result?.monthlyRental?.toFixed(2) || "",
      q.result?.initialRental?.toFixed(2) || "",
      q.status,
      q.createdAt
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `drivalia-quotes-${Date.now()}.csv`;
    link.click();
  };

  // Pagination
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedQuotes = quotes.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (loading && quotes.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Loading quote history...
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div
        className="p-8 rounded-xl border text-center"
        style={{ background: "rgba(26, 31, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      >
        <Car className="h-8 w-8 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">No quote history yet.</p>
        <p className="text-white/40 text-sm mt-1">
          Run quotes from the &quot;Run Quotes&quot; tab to see them here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/60">
          {totalItems} quote{totalItems !== 1 ? "s" : ""} in history
        </div>
        <button
          onClick={exportToCSV}
          disabled={quotes.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "rgba(236, 72, 153, 0.15)",
            color: "#ec4899"
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <th className="text-left p-3 text-white/60 font-medium">Vehicle</th>
              <th className="text-center p-3 text-white/60 font-medium">Term</th>
              <th className="text-center p-3 text-white/60 font-medium">Mileage</th>
              <th className="text-center p-3 text-white/60 font-medium">Contract</th>
              <th className="text-right p-3 text-white/60 font-medium">Monthly</th>
              <th className="text-right p-3 text-white/60 font-medium">Initial</th>
              <th className="text-center p-3 text-white/60 font-medium">Status</th>
              <th className="text-right p-3 text-white/60 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedQuotes.map((quote, idx) => (
              <tr
                key={`${quote.vehicleId}-${quote.term}-${quote.mileage}-${idx}`}
                className="transition-colors hover:bg-white/5"
                style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-white/40" />
                    <div>
                      <div className="text-white font-medium">
                        {quote.manufacturer} {quote.model}
                      </div>
                      {quote.variant && (
                        <div className="text-white/50 text-xs">{quote.variant}</div>
                      )}
                      {quote.capCode && (
                        <div className="text-white/30 text-xs font-mono">{quote.capCode}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-center p-3 text-white/80">{quote.term}m</td>
                <td className="text-center p-3 text-white/80">
                  {(quote.mileage / 1000).toFixed(0)}k
                </td>
                <td className="text-center p-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-pink-500/20 text-pink-300">
                    {getContractLabel(quote.contractType)}
                  </span>
                </td>
                <td className="text-right p-3">
                  <span className={quote.result?.monthlyRental ? "text-pink-400 font-medium" : "text-white/40"}>
                    {formatCurrency(quote.result?.monthlyRental)}
                  </span>
                </td>
                <td className="text-right p-3 text-white/80">
                  {formatCurrency(quote.result?.initialRental)}
                </td>
                <td className="text-center p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {getStatusIcon(quote.status)}
                    <span
                      className={`text-xs ${
                        quote.status === "complete"
                          ? "text-green-400"
                          : quote.status === "error"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {quote.status}
                    </span>
                  </div>
                  {quote.error && (
                    <div className="text-xs text-red-400/70 mt-0.5 truncate max-w-[120px]" title={quote.error}>
                      {quote.error}
                    </div>
                  )}
                </td>
                <td className="text-right p-3 text-white/60 text-xs">
                  {formatDate(quote.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <span className="text-white/60 text-sm px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
