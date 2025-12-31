"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  FileSpreadsheet,
} from "lucide-react";

type OgilvieImport = {
  id: string;
  providerCode: string;
  contractType: string;
  fileName: string | null;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  isLatest: boolean;
  completedAt: string | null;
  createdAt: string;
};

type ImportsTableProps = {
  refreshTrigger?: number;
};

export function OgilvieImportsTable({ refreshTrigger }: ImportsTableProps) {
  const [imports, setImports] = useState<OgilvieImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchImports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/imports?source=ogilvie&pageSize=50");
      const data = await response.json();
      if (data.imports) {
        setImports(data.imports);
      }
    } catch (err) {
      console.error("Error fetching imports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, [refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "processing":
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
      case "processing":
        return "text-[#79d5e9]";
      default:
        return "text-white/40";
    }
  };

  const getContractTypeLabel = (contractType: string) => {
    const labels: Record<string, string> = {
      CH: "Contract Hire",
      CHNM: "CH (No Maint)",
      PCH: "Personal CH",
      PCHNM: "PCH (No Maint)",
      BSSNL: "Salary Sacrifice",
    };
    return labels[contractType] || contractType;
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

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
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

  if (imports.length === 0) {
    return (
      <div
        className="rounded-xl p-8 border text-center"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <Database className="h-8 w-8 text-white/30 mx-auto mb-3" />
        <p className="text-white/50">No imports yet. Import an Ogilvie CSV file to get started.</p>
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
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white/90">Import History</h3>
        <button
          onClick={fetchImports}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-white/5">
        {imports.map((imp) => (
          <div key={imp.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(imp.status)}
                <span className={`text-sm capitalize ${getStatusColor(imp.status)}`}>
                  {imp.status}
                </span>
                {imp.isLatest && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#79d5e9]/20 text-[#79d5e9]">
                    Latest
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">
                {formatDateShort(imp.createdAt)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-white">
                {getContractTypeLabel(imp.contractType)}
              </div>
              <div className="text-sm text-white/70">
                {imp.successRows.toLocaleString()} / {imp.totalRows.toLocaleString()} rates
              </div>
            </div>

            {imp.fileName && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <FileSpreadsheet className="h-3 w-3" />
                <span className="truncate">{imp.fileName}</span>
              </div>
            )}

            {imp.errorRows > 0 && (
              <div className="text-xs text-red-400">
                {imp.errorRows} errors
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Contract Type
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                File
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Rates
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {imports.map((imp) => (
              <tr
                key={imp.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(imp.status)}
                    <span className={`text-sm capitalize ${getStatusColor(imp.status)}`}>
                      {imp.status}
                    </span>
                    {imp.isLatest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#79d5e9]/20 text-[#79d5e9]">
                        Latest
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm text-white">
                    {getContractTypeLabel(imp.contractType)}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {imp.fileName ? (
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-white/40" />
                      <span className="truncate max-w-[200px]">{imp.fileName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-white/30">-</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm">
                    <span className="text-white">{imp.successRows.toLocaleString()}</span>
                    <span className="text-white/40"> / {imp.totalRows.toLocaleString()}</span>
                    {imp.errorRows > 0 && (
                      <span className="text-red-400 ml-2">({imp.errorRows} errors)</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="text-sm text-white/50">
                    {formatDate(imp.createdAt)}
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
