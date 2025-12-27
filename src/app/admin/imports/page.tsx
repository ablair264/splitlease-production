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

// Analysis result types for smart import
interface AnalysisResult {
  format: "tabular" | "matrix" | "unknown";
  confidence: number;
  reason: string;
  sheets: Array<{
    name: string;
    format: string;
    vehicleInfo?: {
      manufacturer?: string;
      variant?: string;
      capCode?: string;
    };
  }>;
  preview: Array<{
    manufacturer: string;
    model: string;
    variant?: string;
    term: number;
    annualMileage: number;
    paymentProfile: string;
    monthlyRental: number;
    isMaintained: boolean;
    contractType: string;
  }>;
}

// Smart Import Modal Component with format detection
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
  const [providerCode, setProviderCode] = useState("");
  const [contractType, setContractType] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview" | "mapping" | "result">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PROVIDERS = [
    { code: "ald", name: "ALD Automotive" },
    { code: "drivalia", name: "Drivalia" },
    { code: "lex", name: "Lex Autolease" },
    { code: "ogilvie", name: "Ogilvie Fleet" },
    { code: "venus", name: "Venus Fleet" },
    { code: "arval", name: "Arval" },
    { code: "zenith", name: "Zenith" },
    { code: "dealer", name: "Dealer Quote" },
    { code: "other", name: "Other" },
  ];

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
    setAnalysisResult(null);

    // Read file content as base64
    const arrayBuffer = await selectedFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    setFileContent(base64);

    // Analyze file using smart import API
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/smart-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileContent: base64,
          action: "analyze",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze file");
      }

      setAnalysisResult(data);

      if (data.format === "matrix") {
        // For matrix format, show preview directly
        setStep("preview");
      } else if (data.format === "tabular") {
        // For tabular format, extract headers for column mapping
        const apiBase = getApiBaseUrl();
        const headersResponse = await fetch(`${apiBase}/api/admin/providers/extract-headers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileContent: base64,
            fileName: selectedFile.name,
            isBase64: true,
          }),
        });

        if (headersResponse.ok) {
          const headersData = await headersResponse.json();
          setHeaders(headersData.headers);
          setSampleRows(headersData.sampleRows);
          setStep("mapping");
        } else {
          // Fallback to preview if header extraction fails
          setStep("preview");
        }
      } else {
        setError("Could not detect file format. Please ensure the file has recognizable headers or matrix structure.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !providerCode) {
      setError("Please select a provider");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/smart-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileContent,
          providerCode,
          contractType: contractType || undefined,
          action: "import",
          dryRun: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult({
        success: data.success,
        stats: {
          totalRows: data.totalRates || 0,
          successRows: data.successRates || 0,
          errorRows: data.errorRates || 0,
        },
        errors: data.errors,
      });

      setStep("result");
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleMappingConfirm = async (
    mappings: Record<string, string | null>,
    providerName: string,
    saveConfig: boolean
  ) => {
    if (!file) return;

    setStep("upload");
    setIsImporting(true);
    setError(null);

    try {
      const apiBase = getApiBaseUrl();
      const mappedProviderCode = providerName.toLowerCase().replace(/[^a-z0-9]/g, "_");

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
          contractType: contractType || "CH",
          fileContent,
          providerCode: mappedProviderCode,
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

      setStep("result");
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProviderCode("");
    setContractType("");
    setHeaders([]);
    setSampleRows([]);
    setError(null);
    setResult(null);
    setFileContent("");
    setAnalysisResult(null);
    setStep("upload");
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
          onClick={isImporting ? undefined : handleClose}
        />

        {/* Modal */}
        <div className="relative bg-[#161c24] rounded-xl border border-gray-800 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                <p className="text-sm text-gray-500">
                  {step === "upload" && "Auto-detects tabular and matrix formats"}
                  {step === "preview" && analysisResult && `Detected ${analysisResult.format} format`}
                  {step === "mapping" && "Map columns to fields"}
                  {step === "result" && "Import complete"}
                </p>
              </div>
            </div>
            {!isImporting && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {step === "upload" && (
              <>
                {/* Description */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 mb-6">
                  <p className="text-sm text-white/70">
                    Upload any ratebook file. Smart Import will automatically detect if it&apos;s a tabular format
                    (one rate per row) or matrix format (payment profiles × mileage grid).
                  </p>
                </div>

                {/* Provider Select */}
                <div className="mb-4">
                  <label className="block text-sm text-white/60 mb-1.5">Provider</label>
                  <select
                    value={providerCode}
                    onChange={(e) => setProviderCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-[#1a1f2a] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Select provider...</option>
                    {PROVIDERS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Type Select */}
                <div className="mb-4">
                  <label className="block text-sm text-white/60 mb-1.5">Contract Type (optional)</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white text-sm bg-[#1a1f2a] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Auto-detect from file...</option>
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
                      disabled={isAnalyzing || isImporting}
                    />
                    <div className="px-4 py-8 text-center">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-purple-400">
                          <FileSpreadsheet className="w-5 h-5" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      ) : isAnalyzing ? (
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
              </>
            )}

            {step === "preview" && analysisResult && (
              <>
                {/* Format Detection Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    analysisResult.format === "matrix"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  )}>
                    {analysisResult.format === "matrix" ? "Matrix Format" : "Tabular Format"}
                  </span>
                  <span className="text-xs text-white/40">
                    {analysisResult.confidence}% confidence
                  </span>
                </div>

                {/* Sheets Info */}
                {analysisResult.sheets.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-white/40 mb-2">Detected Sheets:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.sheets.map((sheet, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-white/10 text-xs text-white/70">
                          {sheet.name}
                          {sheet.vehicleInfo?.manufacturer && ` (${sheet.vehicleInfo.manufacturer})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Table */}
                <div className="mb-4">
                  <p className="text-sm text-white/60 mb-2">
                    Preview ({analysisResult.preview.length} rates detected)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="px-3 py-2 text-left text-white/50">Vehicle</th>
                          <th className="px-3 py-2 text-left text-white/50">Term</th>
                          <th className="px-3 py-2 text-left text-white/50">Mileage</th>
                          <th className="px-3 py-2 text-left text-white/50">Profile</th>
                          <th className="px-3 py-2 text-right text-white/50">Monthly</th>
                          <th className="px-3 py-2 text-center text-white/50">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {analysisResult.preview.slice(0, 10).map((rate, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-white/80">
                              {rate.manufacturer} {rate.model}
                              {rate.variant && <span className="text-white/40 ml-1">{rate.variant}</span>}
                            </td>
                            <td className="px-3 py-2 text-white/60">{rate.term}m</td>
                            <td className="px-3 py-2 text-white/60">{(rate.annualMileage / 1000).toFixed(0)}k</td>
                            <td className="px-3 py-2 text-white/60">{rate.paymentProfile}</td>
                            <td className="px-3 py-2 text-right text-[#79d5e9] font-medium">
                              £{(rate.monthlyRental / 100).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px]",
                                rate.isMaintained
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              )}>
                                {rate.contractType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {analysisResult.preview.length > 10 && (
                    <p className="text-xs text-white/40 mt-2 text-center">
                      + {analysisResult.preview.length - 10} more rates
                    </p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-400 flex items-center gap-2 bg-red-500/10">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={handleReset}
                    disabled={isImporting}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !providerCode}
                    className="px-6 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import {analysisResult.preview.length} Rates
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {step === "result" && result && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    result.success ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    {result.success ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h2 className={cn(
                      "text-lg font-medium",
                      result.success ? "text-green-400" : "text-red-400"
                    )}>
                      {result.success ? "Import Successful" : "Import Failed"}
                    </h2>
                    <p className="text-sm text-white/60">
                      {result.success ? "Ratebook has been imported" : "There were errors during import"}
                    </p>
                  </div>
                </div>

                {result.stats && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-white">
                        {result.stats.totalRows.toLocaleString()}
                      </p>
                      <p className="text-xs text-white/50 mt-1">Total Rates</p>
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

                {result.errors && result.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium mb-2">Errors:</p>
                    <ul className="text-xs text-red-400/70 space-y-1">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
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

      {/* Column Mapping Modal for tabular files */}
      <ColumnMappingModal
        isOpen={step === "mapping"}
        onClose={() => setStep("upload")}
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
