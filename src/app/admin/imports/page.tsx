"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Upload,
  RefreshCw,
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

// Column mapping for the mapping step
interface ColumnMappingItem {
  sourceColumn: number;
  sourceHeader: string;
  targetField: string | null;
  confidence: number;
}

// Analysis result types for smart import
interface AnalysisResult {
  format: "tabular" | "matrix" | "unknown";
  confidence: number;
  reason: string;
  sheets: Array<{
    name: string;
    format: string;
    headerRow?: number;
    columns?: ColumnMappingItem[];
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
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([]);
  const [previewData, setPreviewData] = useState<Array<{
    manufacturer: string;
    model: string;
    variant?: string;
    term: number;
    mileage: number;
    profile: string;
    monthly: number;
    maintained: boolean;
    contract: string;
    source: string;
  }> | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [forceReimport, setForceReimport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available target fields for column mapping - matches provider_rates schema
  const TARGET_FIELDS = [
    { value: "", label: "-- Skip this column --" },
    // Identifiers
    { value: "capCode", label: "CAP Code", required: true },
    { value: "capId", label: "CAP ID" },
    // Vehicle info
    { value: "manufacturer", label: "Manufacturer", required: true },
    { value: "model", label: "Model" },
    { value: "variant", label: "Variant / Description" },
    { value: "bodyStyle", label: "Body Style" },
    { value: "modelYear", label: "Model Year" },
    // Contract terms
    { value: "term", label: "Term (months)", required: true },
    { value: "annualMileage", label: "Annual Mileage", required: true },
    { value: "paymentPlan", label: "Payment Plan" },
    // Pricing
    { value: "monthlyRental", label: "Monthly Rental (Total)", required: true },
    { value: "leaseRental", label: "Lease/Finance Rental" },
    { value: "serviceRental", label: "Service/Maintenance Rental" },
    { value: "nonRecoverableVat", label: "Non-Recoverable VAT" },
    { value: "basicListPrice", label: "Basic List Price" },
    { value: "otr", label: "OTR Price" },
    { value: "p11d", label: "P11D Value" },
    // Vehicle specs
    { value: "co2", label: "CO2 (g/km)" },
    { value: "fuelType", label: "Fuel Type" },
    { value: "transmission", label: "Transmission" },
    // Excess mileage
    { value: "excessMileagePpm", label: "Excess Mileage (pence/mile)" },
    { value: "financeEmcPpm", label: "Finance EMC (pence/mile)" },
    { value: "serviceEmcPpm", label: "Service EMC (pence/mile)" },
    // EV/Hybrid
    { value: "wltpEvRange", label: "WLTP EV Range (miles)" },
    { value: "wltpEvRangeMin", label: "WLTP EV Range Min" },
    { value: "wltpEvRangeMax", label: "WLTP EV Range Max" },
    { value: "wltpEaerMiles", label: "WLTP EAER (miles)" },
    { value: "fuelEcoCombined", label: "Fuel Economy Combined (MPG)" },
    // BIK / Salary Sacrifice
    { value: "bikTaxLowerRate", label: "BIK Tax (20%)" },
    { value: "bikTaxHigherRate", label: "BIK Tax (40%)" },
    { value: "bikPercent", label: "BIK Percentage" },
    // Cost analysis
    { value: "wholeLifeCost", label: "Whole Life Cost" },
    { value: "estimatedSaleValue", label: "Estimated Sale Value" },
    { value: "fuelCostPpm", label: "Fuel Cost (pence/mile)" },
    { value: "insuranceGroup", label: "Insurance Group" },
    // Ratings
    { value: "euroRating", label: "Euro Rating" },
    { value: "rdeCertificationLevel", label: "RDE Certification Level" },
  ];

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

      if (data.format === "tabular") {
        // Tabular format: show column mapping step first
        const firstSheet = data.sheets.find((s: { format: string }) => s.format === "tabular");
        if (firstSheet?.columns) {
          setColumnMappings(firstSheet.columns);
          setStep("mapping");
        } else {
          setError("Could not detect column headers. Please check the file format.");
        }
      } else if (data.format === "matrix") {
        // Matrix format: go directly to preview
        setStep("preview");
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
          forceReimport,
          // Pass custom column mappings for tabular format
          columnMappings: columnMappings.length > 0
            ? columnMappings.reduce((acc, m) => {
                if (m.targetField) {
                  acc[m.sourceColumn] = m.targetField;
                }
                return acc;
              }, {} as Record<number, string>)
            : undefined,
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

  const handleReset = () => {
    setFile(null);
    setProviderCode("");
    setContractType("");
    setError(null);
    setResult(null);
    setFileContent("");
    setAnalysisResult(null);
    setColumnMappings([]);
    setPreviewData(null);
    setForceReimport(false);
    setStep("upload");
  };

  const handleMappingChange = (sourceColumn: number, newTargetField: string) => {
    setColumnMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField: newTargetField || null, confidence: 100 }
          : m
      )
    );
  };

  const handleProceedToPreview = async () => {
    // Validate required fields are mapped
    const mappedFields = columnMappings.filter((m) => m.targetField).map((m) => m.targetField);
    const requiredFields = ["capCode", "manufacturer", "term", "annualMileage", "monthlyRental"];

    // capCode OR capId is required
    if (!mappedFields.includes("capCode") && !mappedFields.includes("capId")) {
      setError("You must map either CAP Code or CAP ID column");
      return;
    }

    // Check other required fields (excluding capCode since we allow capId)
    const otherRequired = requiredFields.filter((f) => f !== "capCode");
    const otherMissing = otherRequired.filter((f) => !mappedFields.includes(f));
    if (otherMissing.length > 0) {
      setError(`Missing required mappings: ${otherMissing.join(", ")}`);
      return;
    }

    setError(null);
    setIsLoadingPreview(true);

    try {
      // Build column mappings object: sourceColumn -> targetField
      const mappingsObj: Record<number, string> = {};
      for (const mapping of columnMappings) {
        if (mapping.targetField) {
          mappingsObj[mapping.sourceColumn] = mapping.targetField;
        }
      }

      // Do a dry-run import with custom column mappings to get accurate preview
      const response = await fetch("/api/smart-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file?.name,
          fileContent: fileContent,
          providerCode: providerCode || "preview",
          contractType: contractType || undefined,
          action: "import",
          dryRun: true,
          columnMappings: mappingsObj,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate preview");
      }

      // Use the sampleRates from the dry-run as preview
      setPreviewData(data.sampleRates || []);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setIsLoadingPreview(false);
    }
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
                  {step === "mapping" && "Review column mappings"}
                  {step === "preview" && analysisResult && `Detected ${analysisResult.format} format`}
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

                {/* Force Reimport Checkbox */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceReimport}
                      onChange={(e) => setForceReimport(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-[#1a1f2a] text-purple-500 focus:ring-purple-500/50"
                    />
                    <span className="text-sm text-white/60">Force reimport (skip duplicate check)</span>
                  </label>
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
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-purple-400">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <div>
                            <p className="text-sm font-medium">Analyzing file...</p>
                            <p className="text-xs text-white/40 mt-1">Detecting columns and format</p>
                          </div>
                        </div>
                      ) : file ? (
                        <div className="flex items-center justify-center gap-2 text-purple-400">
                          <FileSpreadsheet className="w-5 h-5" />
                          <span className="text-sm">{file.name}</span>
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

            {step === "mapping" && columnMappings.length > 0 && (
              <>
                {/* Description */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 mb-4">
                  <p className="text-sm text-white/70">
                    Review and adjust the column mappings below. Fields marked with <span className="text-red-400">*</span> are required.
                  </p>
                </div>

                {/* File Info */}
                <div className="flex items-center gap-2 mb-4 text-sm text-white/60">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{file?.name}</span>
                  <span className="text-white/30">•</span>
                  <span>{columnMappings.length} columns detected</span>
                </div>

                {/* Column Mapping Table */}
                <div className="overflow-x-auto rounded-lg border border-white/10 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-3 py-2 text-left text-white/50 font-medium">#</th>
                        <th className="px-3 py-2 text-left text-white/50 font-medium">Source Column</th>
                        <th className="px-3 py-2 text-center text-white/30 font-medium">→</th>
                        <th className="px-3 py-2 text-left text-white/50 font-medium">Map To Field</th>
                        <th className="px-3 py-2 text-center text-white/50 font-medium">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {columnMappings.map((mapping) => {
                        const targetField = TARGET_FIELDS.find((f) => f.value === mapping.targetField);
                        return (
                          <tr key={mapping.sourceColumn} className="hover:bg-white/5">
                            <td className="px-3 py-2 text-white/40 text-xs">{mapping.sourceColumn + 1}</td>
                            <td className="px-3 py-2 text-white/80 font-mono text-xs">
                              {mapping.sourceHeader}
                            </td>
                            <td className="px-3 py-2 text-center text-white/30">→</td>
                            <td className="px-3 py-2">
                              <select
                                value={mapping.targetField || ""}
                                onChange={(e) => handleMappingChange(mapping.sourceColumn, e.target.value)}
                                className={cn(
                                  "w-full px-2 py-1.5 rounded text-xs bg-[#1a1f2a] border focus:outline-none focus:ring-1 focus:ring-blue-500/50",
                                  mapping.targetField
                                    ? "border-blue-500/30 text-white"
                                    : "border-gray-700 text-white/50"
                                )}
                              >
                                {TARGET_FIELDS.map((field) => (
                                  <option key={field.value} value={field.value}>
                                    {field.label}
                                    {field.required ? " *" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {mapping.targetField && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                                    mapping.confidence >= 90
                                      ? "bg-green-500/20 text-green-400"
                                      : mapping.confidence >= 70
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-blue-500/20 text-blue-400"
                                  )}
                                >
                                  {mapping.confidence}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Required Fields Summary */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                  <p className="text-xs text-white/40 mb-2">Required fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_FIELDS.filter((f) => f.required).map((field) => {
                      const isMapped = columnMappings.some((m) => m.targetField === field.value);
                      return (
                        <span
                          key={field.value}
                          className={cn(
                            "px-2 py-1 rounded text-xs",
                            isMapped
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          )}
                        >
                          {isMapped ? "✓" : "✗"} {field.label}
                        </span>
                      );
                    })}
                  </div>
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
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProceedToPreview}
                    disabled={isLoadingPreview}
                    className="px-6 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)" }}
                  >
                    {isLoadingPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      "Continue to Preview"
                    )}
                  </button>
                </div>
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
                  {analysisResult.format === "tabular" && (
                    <button
                      onClick={() => {
                        setPreviewData(null);
                        setStep("mapping");
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Edit mappings
                    </button>
                  )}
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
                    Preview ({(previewData || analysisResult.preview).length} rates detected)
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
                        {previewData ? (
                          // Use dry-run preview data with custom column mappings
                          previewData.slice(0, 10).map((rate, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="px-3 py-2 text-white/80">
                                {rate.manufacturer} {rate.model}
                                {rate.variant && <span className="text-white/40 ml-1">{rate.variant}</span>}
                              </td>
                              <td className="px-3 py-2 text-white/60">{rate.term}m</td>
                              <td className="px-3 py-2 text-white/60">{(rate.mileage / 1000).toFixed(0)}k</td>
                              <td className="px-3 py-2 text-white/60">{rate.profile}</td>
                              <td className="px-3 py-2 text-right text-[#79d5e9] font-medium">
                                £{rate.monthly.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px]",
                                  rate.maintained
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-gray-500/20 text-gray-400"
                                )}>
                                  {rate.contract}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Fall back to analysis preview (matrix format or initial detection)
                          analysisResult.preview.slice(0, 10).map((rate, i) => (
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(previewData || analysisResult.preview).length > 10 && (
                    <p className="text-xs text-white/40 mt-2 text-center">
                      + {(previewData || analysisResult.preview).length - 10} more rates
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
      // Build query params
      const params = new URLSearchParams();
      if (filters.source !== "all") params.set("source", filters.source);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.dateRange !== "all") params.set("days", filters.dateRange);

      const response = await fetch(`/api/admin/imports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setImports(data.imports || []);
      }
    } catch (error) {
      console.error("Failed to fetch imports:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters.source, filters.status, filters.dateRange]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // Client-side search filter only (server handles source, status, dateRange)
  const filteredImports = filters.search
    ? imports.filter((imp) => {
        const search = filters.search.toLowerCase();
        return (
          imp.providerCode.toLowerCase().includes(search) ||
          imp.contractType.toLowerCase().includes(search)
        );
      })
    : imports;

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
