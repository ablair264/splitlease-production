"use client";

import { useState, useEffect } from "react";
import { Trash2, Clock, Car, Percent } from "lucide-react";

type Batch = {
  scrape_batch_id: string;
  scraped_at: string;
  vehicle_count: string;
  make_count: string;
  avg_discount: string;
};

type BatchesListProps = {
  refreshTrigger?: number;
  onBatchDeleted?: () => void;
};

export function BatchesList({ refreshTrigger, onBatchDeleted }: BatchesListProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fleet-marque/batches");
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [refreshTrigger]);

  const deleteBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This will remove all associated discount terms.")) {
      return;
    }

    setDeleting(batchId);
    try {
      await fetch("/api/fleet-marque/batches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId })
      });
      fetchBatches();
      onBatchDeleted?.();
    } catch (err) {
      console.error("Error deleting batch:", err);
    } finally {
      setDeleting(null);
    }
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

  if (loading) {
    return (
      <div className="text-center py-8 text-white/50">Loading batches...</div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        No scrape batches yet. Run the scraper to create one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => (
        <div
          key={batch.scrape_batch_id}
          className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:bg-white/5"
          style={{
            background: 'rgba(26, 31, 42, 0.6)',
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <code className="text-xs text-[#79d5e9] bg-[#79d5e9]/10 px-2 py-0.5 rounded">
                {batch.scrape_batch_id}
              </code>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(batch.scraped_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" />
                {Number(batch.vehicle_count).toLocaleString()} vehicles
              </span>
              <span className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                {Number(batch.avg_discount).toFixed(1)}% avg
              </span>
              <span className="text-white/40">
                {batch.make_count} makes
              </span>
            </div>
          </div>

          <button
            onClick={() => deleteBatch(batch.scrape_batch_id)}
            disabled={deleting === batch.scrape_batch_id}
            className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
            title="Delete batch"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
