"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { apiFetch, getApiBaseUrl } from "@/lib/utils";

type OgilvieExport = {
  id: string;
  batchId: string;
  status: string;
  contractTerm: number;
  contractMileage: number;
  totalVehicles: number | null;
  exportedRows: number | null;
  errorMessage: string | null;
  hasCsvData: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type ExportsTableProps = {
  refreshTrigger?: number;
};

export function OgilvieExportsTable({ refreshTrigger }: ExportsTableProps) {
  const [exports, setExports] = useState<OgilvieExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExports = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/api/ogilvie/exports?limit=50");
      const data = await response.json();
      if (data.success) {
        setExports(data.exports);
      }
    } catch (err) {
      console.error("Error fetching exports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, [refreshTrigger]);

  const handleDelete = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this export?")) return;

    setDeletingId(batchId);
    try {
      const response = await apiFetch(`/api/ogilvie/exports/${batchId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setExports((prev) => prev.filter((e) => e.batchId !== batchId));
      }
    } catch (err) {
      console.error("Error deleting export:", err);
    } finally {
      setDeletingId(null);
    }
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
        return <Clock className="h-4 w-4 text-white/40" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "running":
        return "text-[#79d5e9]";
      default:
        return "text-white/40";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 border flex items-center justify-center"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Loader2 className="h-6 w-6 text-[#79d5e9] animate-spin" />
      </div>
    );
  }

  if (exports.length === 0) {
    return (
      <div
        className="rounded-xl p-8 border text-center"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <p className="text-white/50">No exports yet. Run an export to get started.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "rgba(26, 31, 42, 0.6)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/90">Export History</h3>
        <button
          onClick={fetchExports}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Configuration
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Vehicles
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Date
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {exports.map((exp) => (
              <tr
                key={exp.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(exp.status)}
                    <span className={`text-sm capitalize ${getStatusColor(exp.status)}`}>
                      {exp.status}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm text-white">
                    {exp.contractTerm} months / {exp.contractMileage.toLocaleString()} miles
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm text-white/70">
                    {exp.exportedRows?.toLocaleString() || "-"}
                    {exp.totalVehicles && exp.totalVehicles !== exp.exportedRows && (
                      <span className="text-white/40"> / {exp.totalVehicles.toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm text-white/50">
                    {formatDate(exp.createdAt)}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {exp.hasCsvData && exp.status === "completed" && (
                      <a
                        href={`${getApiBaseUrl()}/api/ogilvie/exports/${exp.batchId}?download=true`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-[#79d5e9]/20"
                        style={{
                          background: "rgba(121, 213, 233, 0.1)",
                          border: "1px solid rgba(121, 213, 233, 0.3)",
                          color: "#79d5e9",
                        }}
                      >
                        <Download className="h-3 w-3" />
                        CSV
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(exp.batchId)}
                      disabled={deletingId === exp.batchId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                      }}
                    >
                      {deletingId === exp.batchId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
