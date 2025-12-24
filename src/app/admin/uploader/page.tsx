"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/utils";

type UploadTab = "venus" | "ratebook";

interface VenusImportResult {
  success: boolean;
  message: string;
  stats?: {
    totalRates: number;
    insertedRates: number;
    matchedVehicles: number;
    unmatchedVehicles: number;
    sheetsProcessed: string[];
  };
  errors?: string[];
}

interface RatebookImportResult {
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

const PROVIDERS = [
  { value: "lex", label: "Lex Autolease" },
  { value: "ogilvie", label: "Ogilvie Fleet" },
];

export default function UploaderPage() {
  const [activeTab, setActiveTab] = useState<UploadTab>("venus");

  // Venus upload state
  const [venusIsDragOver, setVenusIsDragOver] = useState(false);
  const [venusIsUploading, setVenusIsUploading] = useState(false);
  const [venusResult, setVenusResult] = useState<VenusImportResult | null>(null);
  const [venusSelectedFile, setVenusSelectedFile] = useState<File | null>(null);

  // Ratebook upload state
  const [ratebookProvider, setRatebookProvider] = useState("");
  const [ratebookContractType, setRatebookContractType] = useState("");
  const [ratebookFile, setRatebookFile] = useState<File | null>(null);
  const [ratebookIsUploading, setRatebookIsUploading] = useState(false);
  const [ratebookError, setRatebookError] = useState<string | null>(null);
  const [ratebookResult, setRatebookResult] = useState<RatebookImportResult | null>(null);
  const ratebookFileInputRef = useRef<HTMLInputElement>(null);

  // Venus handlers
  const handleVenusDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setVenusIsDragOver(true);
  }, []);

  const handleVenusDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setVenusIsDragOver(false);
  }, []);

  const handleVenusDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setVenusIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setVenusSelectedFile(file);
        setVenusResult(null);
      } else {
        setVenusResult({
          success: false,
          message: "Please upload an Excel file (.xlsx or .xls)",
        });
      }
    }
  }, []);

  const handleVenusFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setVenusSelectedFile(files[0]);
      setVenusResult(null);
    }
  }, []);

  const handleVenusUpload = async () => {
    if (!venusSelectedFile) return;

    setVenusIsUploading(true);
    setVenusResult(null);

    try {
      const formData = new FormData();
      formData.append("file", venusSelectedFile);

      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/admin/uploader/venus`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setVenusResult({
          success: true,
          message: data.message || "Import completed successfully",
          stats: data.stats,
          errors: data.errors,
        });
      } else {
        setVenusResult({
          success: false,
          message: data.error || "Import failed",
          errors: data.errors,
        });
      }
    } catch (error) {
      setVenusResult({
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setVenusIsUploading(false);
    }
  };

  const handleVenusReset = () => {
    setVenusSelectedFile(null);
    setVenusResult(null);
  };

  // Ratebook handlers
  const handleRatebookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setRatebookError("Please select a CSV file");
        return;
      }
      setRatebookFile(selectedFile);
      setRatebookError(null);
      setRatebookResult(null);
    }
  };

  const handleRatebookUpload = async () => {
    if (!ratebookProvider || !ratebookContractType || !ratebookFile) {
      setRatebookError("Please select provider, contract type, and file");
      return;
    }

    setRatebookIsUploading(true);
    setRatebookError(null);
    setRatebookResult(null);

    try {
      const csvContent = await ratebookFile.text();

      // Use splitlease-api on Railway for imports
      const apiBase = getApiBaseUrl();
      const queryParams = new URLSearchParams({
        fileName: ratebookFile.name,
        contractType: ratebookContractType,
        providerCode: ratebookProvider,
      });

      const res = await fetch(`${apiBase}/api/admin/ratebooks/import-stream?${queryParams}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvContent,
      });

      const data = await res.json();

      if (!res.ok) {
        setRatebookError(data.error || "Upload failed");
        return;
      }

      setRatebookResult({
        success: data.success,
        stats: data.stats,
        errors: data.errors,
      });
    } catch (err) {
      setRatebookError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setRatebookIsUploading(false);
    }
  };

  const handleRatebookReset = () => {
    setRatebookProvider("");
    setRatebookContractType("");
    setRatebookFile(null);
    setRatebookError(null);
    setRatebookResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rate Uploader</h1>
        <p className="text-white/60 mt-1">
          Upload ratebooks from finance providers
        </p>
      </div>

      {/* Tab Navigation */}
      <div
        className="flex gap-1 p-1 rounded-lg w-fit"
        style={{ background: "rgba(26, 31, 42, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <button
          onClick={() => setActiveTab("venus")}
          className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "venus" ? "text-white" : "text-white/60 hover:text-white"
          }`}
          style={activeTab === "venus" ? { background: "#1e8d8d" } : {}}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Venus Fleet
        </button>
        <button
          onClick={() => setActiveTab("ratebook")}
          className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "ratebook" ? "text-white" : "text-white/60 hover:text-white"
          }`}
          style={activeTab === "ratebook" ? { background: "#1e8d8d" } : {}}
        >
          <FileText className="w-4 h-4" />
          CSV Ratebook
        </button>
      </div>

      {/* Content Area */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {activeTab === "venus" ? (
          /* Venus Upload Tab */
          <>
            {!venusResult ? (
              <>
                {/* Drop Zone */}
                <div
                  onDragOver={handleVenusDragOver}
                  onDragLeave={handleVenusDragLeave}
                  onDrop={handleVenusDrop}
                  className={`
                    relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                    ${venusIsDragOver ? "border-cyan-500 bg-cyan-500/10" : "border-white/20 hover:border-white/40"}
                    ${venusSelectedFile ? "border-green-500/50 bg-green-500/5" : ""}
                  `}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleVenusFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={venusIsUploading}
                  />

                  {venusSelectedFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-xl bg-green-500/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-white">{venusSelectedFile.name}</p>
                        <p className="text-sm text-white/50 mt-1">
                          {(venusSelectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white/40" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-white">
                          Drop Venus Excel file here
                        </p>
                        <p className="text-sm text-white/50 mt-1">
                          or click to browse (.xlsx, .xls)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                {venusSelectedFile && (
                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button
                      onClick={handleVenusReset}
                      disabled={venusIsUploading}
                      className="px-6 py-3 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVenusUpload}
                      disabled={venusIsUploading}
                      className="px-8 py-3 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50 transition-all"
                      style={{
                        background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)",
                      }}
                    >
                      {venusIsUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Import Rates
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Info */}
                <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h3 className="text-sm font-medium text-white/80 mb-2">How it works</h3>
                  <ul className="text-sm text-white/50 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">1.</span>
                      Download the Venus Fleet Management workbook from SharePoint
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">2.</span>
                      Upload the Excel file here - each sheet will be processed as a manufacturer
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">3.</span>
                      Rates are matched to vehicles, scored, and imported into the database
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              /* Venus Result Display */
              <div className="space-y-6">
                {/* Status Header */}
                <div className="flex items-center gap-4">
                  {venusResult.success ? (
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                  <div>
                    <h2 className={`text-lg font-medium ${venusResult.success ? "text-green-400" : "text-red-400"}`}>
                      {venusResult.success ? "Import Successful" : "Import Failed"}
                    </h2>
                    <p className="text-sm text-white/60">{venusResult.message}</p>
                  </div>
                </div>

                {/* Stats */}
                {venusResult.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-white">{venusResult.stats.totalRates.toLocaleString()}</p>
                      <p className="text-xs text-white/50 mt-1">Total Rates Parsed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-green-400">{venusResult.stats.insertedRates.toLocaleString()}</p>
                      <p className="text-xs text-white/50 mt-1">Rates Inserted</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-cyan-400">{venusResult.stats.matchedVehicles}</p>
                      <p className="text-xs text-white/50 mt-1">Vehicles Matched</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-2xl font-bold text-amber-400">{venusResult.stats.unmatchedVehicles}</p>
                      <p className="text-xs text-white/50 mt-1">Unmatched Vehicles</p>
                    </div>
                  </div>
                )}

                {/* Sheets Processed */}
                {venusResult.stats?.sheetsProcessed && venusResult.stats.sheetsProcessed.length > 0 && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-white/80 mb-3">Sheets Processed</h3>
                    <div className="flex flex-wrap gap-2">
                      {venusResult.stats.sheetsProcessed.map((sheet) => (
                        <span
                          key={sheet}
                          className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        >
                          {sheet}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {venusResult.errors && venusResult.errors.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <h3 className="text-sm font-medium text-red-400">Errors ({venusResult.errors.length})</h3>
                    </div>
                    <ul className="text-sm text-red-300/80 space-y-1 max-h-40 overflow-y-auto">
                      {venusResult.errors.slice(0, 20).map((error, i) => (
                        <li key={i} className="truncate">{error}</li>
                      ))}
                      {venusResult.errors.length > 20 && (
                        <li className="text-red-400/60">...and {venusResult.errors.length - 20} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Reset Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleVenusReset}
                    className="px-6 py-3 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Upload Another File
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Ratebook Upload Tab */
          <div className="max-w-lg mx-auto space-y-6">
            {!ratebookResult?.success ? (
              <>
                {/* Provider Select */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Finance Provider</label>
                  <select
                    value={ratebookProvider}
                    onChange={(e) => setRatebookProvider(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white text-sm"
                    style={{
                      background: "rgba(26, 31, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <option value="">Select provider...</option>
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Type Select */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Contract Type</label>
                  <select
                    value={ratebookContractType}
                    onChange={(e) => setRatebookContractType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white text-sm"
                    style={{
                      background: "rgba(26, 31, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
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
                  <label className="block text-sm text-white/60 mb-1.5">CSV File</label>
                  <div
                    className="relative rounded-lg cursor-pointer hover:border-cyan-500/50 transition-colors"
                    style={{
                      background: "rgba(26, 31, 42, 0.8)",
                      border: "1px dashed rgba(255, 255, 255, 0.2)",
                    }}
                    onClick={() => ratebookFileInputRef.current?.click()}
                  >
                    <input
                      ref={ratebookFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleRatebookFileChange}
                      className="hidden"
                    />
                    <div className="px-4 py-8 text-center">
                      {ratebookFile ? (
                        <div className="flex items-center justify-center gap-2 text-cyan-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">{ratebookFile.name}</span>
                        </div>
                      ) : (
                        <div className="text-white/40">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Click to select CSV file</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error */}
                {ratebookError && (
                  <div
                    className="px-4 py-3 rounded-lg text-sm text-red-400 flex items-center gap-2"
                    style={{ background: "rgba(239, 68, 68, 0.1)" }}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {ratebookError}
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleRatebookUpload}
                    disabled={ratebookIsUploading || !ratebookProvider || !ratebookContractType || !ratebookFile}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)",
                    }}
                  >
                    {ratebookIsUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Ratebook
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Ratebook Result Display */
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-green-400">Upload Successful</h2>
                    <p className="text-sm text-white/60">Ratebook has been imported</p>
                  </div>
                </div>

                {ratebookResult.stats && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-white">{ratebookResult.stats.totalRows.toLocaleString()}</p>
                      <p className="text-xs text-white/50 mt-1">Total Rows</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-green-400">{ratebookResult.stats.successRows.toLocaleString()}</p>
                      <p className="text-xs text-white/50 mt-1">Success</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-red-400">{ratebookResult.stats.errorRows}</p>
                      <p className="text-xs text-white/50 mt-1">Errors</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleRatebookReset}
                    className="px-6 py-3 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Upload Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
