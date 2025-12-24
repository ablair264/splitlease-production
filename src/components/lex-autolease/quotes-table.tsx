"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trash2, Download, Car, Wrench } from "lucide-react";
import { apiFetch } from "@/lib/utils";

type Quote = {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  term: number;
  annual_mileage: number;
  initial_rental: number | null;
  monthly_rental: number | null;
  maintenance_included: boolean;
  status: string;
  error_message: string | null;
  request_batch_id: string | null;
  quoted_at: string | null;
  created_at: string;
};

type QuotesTableProps = {
  refreshTrigger?: number;
};

export function QuotesTable({ refreshTrigger }: QuotesTableProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25"
      });
      if (selectedMake) params.append("make", selectedMake);

      const response = await apiFetch(`/api/lex-autolease/quotes?${params}`);
      const data = await response.json();
      setQuotes(data.quotes || []);
      setMakes(data.makes || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [page, selectedMake, refreshTrigger]);

  const deleteQuote = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    setDeleting(id);
    try {
      await apiFetch("/api/lex-autolease/quotes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: id })
      });
      fetchQuotes();
    } catch (err) {
      console.error("Error deleting quote:", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (pence: number | null) => {
    if (pence === null) return "-";
    return `£${(pence / 100).toFixed(2)}`;
  };

  const exportToCSV = () => {
    if (quotes.length === 0) return;

    const headers = ["Make", "Model", "Variant", "Term", "Mileage", "Monthly", "Initial", "Maintenance", "Status", "Date"];
    const rows = quotes.map(q => [
      q.make,
      q.model,
      q.variant || "",
      q.term,
      q.annual_mileage,
      q.monthly_rental ? (q.monthly_rental / 100).toFixed(2) : "",
      q.initial_rental ? (q.initial_rental / 100).toFixed(2) : "",
      q.maintenance_included ? "Yes" : "No",
      q.status,
      q.quoted_at || q.created_at
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lex-quotes-${Date.now()}.csv`;
    link.click();
  };

  if (loading && quotes.length === 0) {
    return <div className="text-center py-8 text-white/50">Loading quotes...</div>;
  }

  return (
    <div>
      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedMake}
            onChange={(e) => {
              setSelectedMake(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "rgba(15, 20, 25, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "white"
            }}
          >
            <option value="">All Makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
        </div>

        <button
          onClick={exportToCSV}
          disabled={quotes.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "rgba(121, 213, 233, 0.15)",
            color: "#79d5e9"
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          No quotes yet. Run the automation script on the Lex Autolease website.
        </div>
      ) : (
        <>
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
                  <th className="text-right p-3 text-white/60 font-medium">Monthly</th>
                  <th className="text-right p-3 text-white/60 font-medium">Initial</th>
                  <th className="text-center p-3 text-white/60 font-medium">Maint.</th>
                  <th className="text-center p-3 text-white/60 font-medium">Status</th>
                  <th className="w-10 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-white/40" />
                        <div>
                          <div className="text-white font-medium">
                            {quote.make} {quote.model}
                          </div>
                          {quote.variant && (
                            <div className="text-white/50 text-xs">{quote.variant}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3 text-white/80">{quote.term}m</td>
                    <td className="text-center p-3 text-white/80">
                      {quote.annual_mileage.toLocaleString()}
                    </td>
                    <td className="text-right p-3">
                      <span className={quote.monthly_rental ? "text-[#79d5e9] font-medium" : "text-white/40"}>
                        {formatCurrency(quote.monthly_rental)}
                      </span>
                    </td>
                    <td className="text-right p-3 text-white/80">
                      {formatCurrency(quote.initial_rental)}
                    </td>
                    <td className="text-center p-3">
                      {quote.maintenance_included ? (
                        <Wrench className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          quote.status === "success"
                            ? "bg-green-500/20 text-green-400"
                            : quote.status === "error"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteQuote(quote.id)}
                        disabled={deleting === quote.id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
        </>
      )}
    </div>
  );
}
