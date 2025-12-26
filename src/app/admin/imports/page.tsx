"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import {
  Upload,
  RefreshCw,
  Globe,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  FileSpreadsheet,
  Sparkles,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ColumnMappingModal from "@/components/admin/ColumnMappingModal";

// Types
interface Import {
  id: string;
  providerCode: string;
  contractType: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  isLatest: boolean;
  completedAt: string | null;
  createdAt: string;
}

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  highlight?: boolean;
}

interface ImportResult {
  success: boolean;
  stats?: { totalRows: number; successRows: number; errorRows: number };
  errors?: string[];
}

const CONTRACT_TYPES = [
  { value: "CH", label: "Contract Hire" },
  { value: "CHNM", label: "Contract Hire (No Maintenance)" },
  { value: "PCH", label: "Personal Contract Hire" },
  { value: "PCHNM", label: "Personal Contract Hire (No Maintenance)" },
  { value: "BSSNL", label: "Salary Sacrifice" },
];

// Quick Action Card Component
function QuickActionCard({ icon, title, subtitle, onClick, highlight }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 border rounded-xl p-5 text-left transition-all group",
        highlight
          ? "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/30 hover:border-purple-500/50"
          : "bg-[#161c24] border-gray-800 hover:border-[#79d5e9]/30 hover:bg-[#79d5e9]/5"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "p-3 rounded-lg transition-colors",
            highlight
              ? "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30"
              : "bg-[#79d5e9]/10 text-[#79d5e9] group-hover:bg-[#79d5e9]/20"
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

// Status Badge Component
function StatusBadge({ status, hasErrors }: { status: string; hasErrors: boolean }) {
  if (status === "completed" && !hasErrors) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#4d9869]/20 text-[#4d9869] border border-[#4d9869]/30">
        <CheckCircle2 className="w-3 h-3" />
        Done
      </span>
    );
  }
  if (status === "completed" && hasErrors) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f8d824]/20 text-[#f8d824] border border-[#f8d824]/30">
        <AlertCircle className="w-3 h-3" />
        Warnings
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#dd4444]/20 text-[#dd4444] border border-[#dd4444]/30">
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#79d5e9]/20 text-[#79d5e9] border border-[#79d5e9]/30">
        <Clock className="w-3 h-3 animate-spin" />
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-400 border border-gray-700">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

// Smart Import Modal Component
function SmartImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      setError("Please select a CSV or XLSX file");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Read file content
    const isXLSX = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    let fileContentStr: string;

    if (isXLSX) {
      const arrayBuffer = await selectedFile.arrayBuffer();
      fileContentStr = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
    } else {
      fileContentStr = await selectedFile.text();
    }

    setFileContent(fileContentStr);

    // Extract headers
    setIsExtracting(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/admin/providers/extract-headers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent: fileContentStr,
          fileName: selectedFile.name,
          isBase64: isXLSX,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract headers");
      }

      const data = await response.json();
      setHeaders(data.headers);
      setSampleRows(data.sampleRows);
      setShowMapping(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract headers");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMappingConfirm = async (
    mappings: Record<string, string | null>,
    providerName: string,
    saveConfig: boolean
  ) => {
    if (!file || !contractType) {
      setError("Please select a contract type");
      return;
    }

    setShowMapping(false);
    setIsUploading(true);
    setError(null);

    try {
      const apiBase = getApiBaseUrl();
      const providerCode = providerName.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // Save provider configuration if requested
      if (saveConfig) {
        await fetch(`${apiBase}/api/admin/providers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerName,
            columnMappings: mappings,
            fileFormat: file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx",
          }),
        });
      }

      // Import with mappings
      const response = await fetch(`${apiBase}/api/admin/ratebooks/import-with-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contractType,
          fileContent,
          providerCode,
          columnMappings: mappings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setResult({
        success: data.success,
        stats: {
          totalRows: data.totalRows || 0,
          successRows: data.successRows || 0,
          errorRows: data.errorRows || 0,
        },
        errors: data.errors,
      });

      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setContractType("");
    setHeaders([]);
    setSampleRows([]);
    setShowMapping(false);
    setError(null);
    setResult(null);
    setFileContent("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={isUploading ? undefined : handleClose}
        />

        {/* Modal */}
        <div className="relative bg-[#161c24] rounded-xl border border-gray-800 w-full max-w-lg shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Smart Import</h2>
                <p className="text-sm text-gray-500">AI-powered column mapping</p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {!result?.success ? (
              <>
                {/* Description */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-6">
                  <p className="text-sm text-white/70">
                    Upload any ratebook file and our AI will automatically detect column mappings.
                    Works with any provider&apos;s format.
                  </p>
                </div>

                {/* Contract Type Select */}
                <div className="mb-4">
                  <label className="block text-sm text-white/60 mb-1.5">Contract Type</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-[#1a1f2a] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Select contract type...</option>
                    {CONTRACT_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Input */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Ratebook File</label>
                  <div
                    className="relative rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors bg-[#1a1f2a] border border-dashed border-purple-500/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isExtracting || isUploading}
                    />
                    <div className="px-4 py-8 text-center">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-purple-400">
                          <FileSpreadsheet className="w-5 h-5" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      ) : isExtracting ? (
                        <div className="flex items-center justify-center gap-2 text-purple-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Analyzing file...</span>
                        </div>
                      ) : (
                        <div className="text-white/40">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Click to select CSV or XLSX file</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 px-4 py-3 rounded-lg text-sm text-red-400 flex items-center gap-2 bg-red-500/10">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Status */}
                {isUploading && (
                  <div className="mt-4 flex items-center justify-center gap-2 py-4 text-purple-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Importing ratebook...</span>
                  </div>
                )}
              </>
            ) : (
              /* Result Display */
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-green-400">Import Successful</h2>
                    <p className="text-sm text-white/60">Ratebook has been imported</p>
                  </div>
                </div>

                {result.stats && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-white">
                        {result.stats.totalRows.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/50 mt-1">Total Rows</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-green-400">
                        {result.stats.successRows.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/50 mt-1">Success</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-red-400">{result.stats.errorRows}</p>
                      <p className="text-xs text-white/50 mt-1">Errors</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all bg-white/10 border border-white/20 hover:bg-white/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Import Another
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={showMapping}
        onClose={() => setShowMapping(false)}
        onConfirm={handleMappingConfirm}
        fileName={file?.name || ""}
        headers={headers}
        sampleRows={sampleRows}
      />
    </>
  );
}

// Provider name formatter
function formatProviderName(code: string): string {
  const names: Record<string, string> = {
    ald: "ALD Automotive",
    ald_automotive: "ALD Automotive",
    drivalia: "Drivalia",
    lex: "Lex Autolease",
    ogilvie: "Ogilvie Fleet",
    venus: "Venus",
  };
  return names[code.toLowerCase()] || code;
}

// Type formatter for import source
function formatImportType(status: string, provider: string): string {
  if (provider.toLowerCase().includes("ogilvie")) return "Scrape";
  if (provider.toLowerCase().includes("fleet")) return "Manual";
  return "Excel";
}

export default function ImportManagerPage() {
  const [imports, setImports] = useState<Import[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [filters, setFilters] = useState({
    source: "all",
    status: "all",
    dateRange: "7",
    search: "",
  });

  const fetchImports = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setImports(data.recentImports || []);
      }
    } catch (error) {
      console.error("Failed to fetch imports:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // Filter imports
  const filteredImports = imports.filter((imp) => {
    if (filters.source !== "all" && imp.providerCode.toLowerCase() !== filters.source) {
      return false;
    }
    if (filters.status !== "all" && imp.status !== filters.status) {
      return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        imp.providerCode.toLowerCase().includes(search) ||
        imp.contractType.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Import Manager</h1>
          <p className="text-sm text-gray-400">
            Upload and track ratebook imports from multiple sources
          </p>
        </div>
        <button
          onClick={() => setShowSmartImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-colors"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
        >
          <Sparkles className="w-4 h-4" />
          New Import
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<Sparkles className="w-5 h-5" />}
          title="Smart Import"
          subtitle="AI-powered mapping"
          onClick={() => setShowSmartImport(true)}
          highlight
        />
        <QuickActionCard
          icon={<RefreshCw className="w-5 h-5" />}
          title="Lex Session Sync"
          subtitle="Auto-fetch quotes"
          onClick={() => {
            window.location.href = "/admin/lex-autolease";
          }}
        />
        <QuickActionCard
          icon={<Globe className="w-5 h-5" />}
          title="Ogilvie Scrape"
          subtitle="Export from portal"
          onClick={() => {
            window.location.href = "/admin/ogilvie";
          }}
        />
        <QuickActionCard
          icon={<FileText className="w-5 h-5" />}
          title="Drivalia Quotes"
          subtitle="Run quotes"
          onClick={() => {
            window.location.href = "/admin/drivalia";
          }}
        />
      </div>

      {/* Import History */}
      <div className="bg-[#161c24] rounded-xl border border-gray-800">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Import History</h2>

            <div className="flex flex-wrap items-center gap-3 ml-auto">
              {/* Source Filter */}
              <select
                value={filters.source}
                onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
                className="px-3 py-2 bg-[#1a1f2a] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
              >
                <option value="all">All Sources</option>
                <option value="ald">ALD Automotive</option>
                <option value="drivalia">Drivalia</option>
                <option value="lex">Lex Autolease</option>
                <option value="ogilvie">Ogilvie Fleet</option>
                <option value="venus">Venus</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-2 bg-[#1a1f2a] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              {/* Date Range Filter */}
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}
                className="px-3 py-2 bg-[#1a1f2a] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="pl-9 pr-4 py-2 bg-[#1a1f2a] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50 w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rates
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Success
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Errors
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-700 rounded w-16" />
                    </td>
                  </tr>
                ))
              ) : filteredImports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No imports found
                  </td>
                </tr>
              ) : (
                filteredImports.map((imp) => {
                  const hasErrors = imp.errorRows > 0;
                  const date = imp.completedAt || imp.createdAt;

                  return (
                    <tr
                      key={imp.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">
                            {formatProviderName(imp.providerCode)}
                          </span>
                          <span className="text-xs text-gray-500">{imp.contractType}</span>
                          {imp.isLatest && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#4d9869]/20 text-[#4d9869]">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {formatImportType(imp.status, imp.providerCode)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">
                          {imp.totalRows.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#4d9869]">
                          {imp.successRows.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {imp.errorRows > 0 ? (
                          <span className="text-sm text-[#dd4444]">{imp.errorRows}</span>
                        ) : (
                          <span className="text-sm text-gray-500">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={imp.status} hasErrors={hasErrors} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">
                          {formatDistanceToNow(new Date(date), { addSuffix: true })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {filteredImports.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing {filteredImports.length} imports</p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors">
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-[#79d5e9]/20 text-[#79d5e9] rounded">1</span>
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={showSmartImport}
        onClose={() => setShowSmartImport(false)}
        onImportComplete={fetchImports}
      />
    </div>
  );
}
