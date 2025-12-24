"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { FLEET_MARQUE_MAKES } from "@/lib/scraper/fleet-marque-constants";

type Term = {
  id: string;
  cap_code: string;
  vehicle_id: string | null;
  make: string;
  model: string;
  derivative: string | null;
  cap_price: number | null;
  co2: number | null;
  discount_percent: string | null;
  discounted_price: number | null;
  savings: number | null;
  build_url: string | null;
  scrape_batch_id: string | null;
  scraped_at: string;
  fuel_type?: string | null;
  transmission?: string | null;
};

type TermsTableProps = {
  refreshTrigger?: number;
};

export function TermsTable({ refreshTrigger }: TermsTableProps) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [make, setMake] = useState("");
  const [minDiscount, setMinDiscount] = useState("");
  const limit = 25;

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });
      if (make) params.set("make", make);
      if (minDiscount) params.set("minDiscount", minDiscount);

      const response = await fetch(`/api/fleet-marque/terms?${params}`);
      const data = await response.json();
      setTerms(data.terms || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching terms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [page, make, minDiscount, refreshTrigger]);

  const totalPages = Math.ceil(total / limit);

  const formatPrice = (pence: number | null) => {
    if (!pence) return "-";
    return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={make}
          onChange={(e) => { setMake(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
          style={{
            background: 'rgba(15, 20, 25, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <option value="">All Makes</option>
          {FLEET_MARQUE_MAKES.map((m) => (
            <option key={m.slug} value={m.name}>{m.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Min Discount:</span>
          <input
            type="number"
            value={minDiscount}
            onChange={(e) => { setMinDiscount(e.target.value); setPage(0); }}
            placeholder="0"
            className="w-20 px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
            style={{
              background: 'rgba(15, 20, 25, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
          <span className="text-xs text-white/50">%</span>
        </div>

        <div className="ml-auto text-sm text-white/50">
          {total.toLocaleString()} terms
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'rgba(26, 31, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(15, 20, 25, 0.5)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">CAP Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Make / Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Derivative</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">CAP Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">Net Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">CO2</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">Linked</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">Build</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-white/50">
                    Loading...
                  </td>
                </tr>
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-white/50">
                    No terms found. Run the scraper to import data.
                  </td>
                </tr>
              ) : (
                terms.map((term) => (
                  <tr key={term.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-sm text-white/70 font-mono">{term.cap_code}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{term.make}</div>
                      <div className="text-xs text-white/50">{term.model}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70 max-w-[200px] truncate" title={term.derivative || ""}>
                      {term.derivative || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70 text-right">
                      {formatPrice(term.cap_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="inline-flex px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          background: Number(term.discount_percent) >= 10 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                          color: Number(term.discount_percent) >= 10 ? '#22c55e' : '#fbbf24'
                        }}
                      >
                        {term.discount_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#79d5e9] text-right font-medium">
                      {formatPrice(term.discounted_price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50 text-right">
                      {term.co2 ? `${term.co2} g/km` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {term.vehicle_id ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Linked to vehicle" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-white/20" title="Not linked" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {term.build_url && (
                        <a
                          href={term.build_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/50 hover:text-[#79d5e9] transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div className="text-sm text-white/50">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <span className="text-sm text-white/70 min-w-[80px] text-center">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
