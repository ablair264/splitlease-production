"use client";

import { useState, useEffect } from "react";
import { Trash2, Clock, CheckCircle, XCircle, Loader2, Car } from "lucide-react";

type Request = {
  id: string;
  batch_id: string;
  status: string;
  total_vehicles: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  term: number;
  annual_mileage: number;
  maintenance_included: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  actual_quote_count: string;
};

type RequestsListProps = {
  refreshTrigger?: number;
  onRequestDeleted?: () => void;
};

export function RequestsList({ refreshTrigger, onRequestDeleted }: RequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/lex-autolease/requests");
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshTrigger]);

  const deleteRequest = async (batchId: string) => {
    if (!confirm("Delete this request batch and all associated quotes?")) return;
    setDeleting(batchId);
    try {
      await fetch("/api/lex-autolease/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId })
      });
      fetchRequests();
      onRequestDeleted?.();
    } catch (err) {
      console.error("Error deleting request:", err);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-[#79d5e9] animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-white/50">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        No request batches yet. Start a new quote request.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:bg-white/5"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            borderColor: "rgba(255, 255, 255, 0.1)"
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getStatusIcon(request.status)}
              <code className="text-xs text-[#79d5e9] bg-[#79d5e9]/10 px-2 py-0.5 rounded">
                {request.batch_id}
              </code>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  request.status === "completed"
                    ? "bg-green-500/20 text-green-400"
                    : request.status === "failed"
                    ? "bg-red-500/20 text-red-400"
                    : request.status === "running"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {request.status}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(request.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" />
                {request.success_count}/{request.total_vehicles} vehicles
              </span>
              <span className="text-white/40">
                {request.term}m / {request.annual_mileage.toLocaleString()} mi
              </span>
              {request.maintenance_included && (
                <span className="text-green-400/80 text-xs">+ Maintenance</span>
              )}
            </div>

            {request.error_count > 0 && (
              <div className="mt-2 text-xs text-red-400">
                {request.error_count} errors
              </div>
            )}
          </div>

          <button
            onClick={() => deleteRequest(request.batch_id)}
            disabled={deleting === request.batch_id}
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
