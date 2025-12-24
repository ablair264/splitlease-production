"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn, getApiBaseUrl } from "@/lib/utils";
import {
  Upload,
  RefreshCw,
  Globe,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Chunked import settings
const CHUNK_SIZE_ROWS = 20000; // 20k rows per chunk
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

// Split CSV content into chunks, preserving header in each chunk
function splitCsvIntoChunks(csvContent: string, chunkSizeRows: number = CHUNK_SIZE_ROWS): { chunks: string[]; headerRow: string } {
  const lines = csvContent.split("\n");
  const headerRow = lines[0];
  const dataRows = lines.slice(1).filter(line => line.trim().length > 0);

  const chunks: string[] = [];
  for (let i = 0; i < dataRows.length; i += chunkSizeRows) {
    const chunkRows = dataRows.slice(i, i + chunkSizeRows);
    // First chunk includes header, subsequent chunks don't (header sent separately)
    if (i === 0) {
      chunks.push(headerRow + "\n" + chunkRows.join("\n"));
    } else {
      chunks.push(chunkRows.join("\n"));
    }
  }

  return { chunks, headerRow };
}

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
}

interface DetectedFile {
  file: File;
  provider: string | null;
  providerName: string;
  rowCount: number;
  isValid: boolean;
  error?: string;
}

// Provider detection based on CSV/XLSX headers
const PROVIDER_SIGNATURES: Record<string, { headers: string[]; name: string }> = {
  ald: {
    headers: ["CAP CODE", "NET RENTAL WM", "NET RENTAL CM", "ANNUAL_MILEAGE", "MANUFACTURER"],
    name: "ALD Automotive",
  },
  lex: {
    headers: ["Vehicle Rental", "Service Rental", "Non Recoverable VAT", "P11D Price"],
    name: "Lex Autolease",
  },
  ogilvie: {
    headers: ["MonthlyRental", "FinanceElement", "MaintenanceElement"],
    name: "Ogilvie Fleet",
  },
  venus: {
    headers: ["Monthly Payment", "Maintenance Cost", "Initial Payment"],
    name: "Venus Fleet",
  },
  drivalia: {
    headers: ["Canone", "Anticipo", "Durata"],
    name: "Drivalia",
  },
};

async function detectFileInfo(file: File): Promise<DetectedFile> {
  try {
    const isXLSX = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

    let headerLine: string;
    let rowCount: number;

    if (isXLSX) {
      // For XLSX files, we can't easily read headers client-side without a library
      // Check filename for ALD pattern: "Broker - CHcm60" or similar
      const fileName = file.name.toUpperCase();
      if (fileName.includes("BROKER") && (fileName.includes("CH") || fileName.includes("PCH"))) {
        return {
          file,
          provider: "ald",
          providerName: "ALD Automotive",
          rowCount: Math.round(file.size / 200), // Estimate ~200 bytes per row
          isValid: true,
        };
      }

      // Generic XLSX - can't determine provider without parsing
      return {
        file,
        provider: null,
        providerName: "Excel File",
        rowCount: Math.round(file.size / 200),
        isValid: true,
      };
    }

    // For CSV files, read and parse headers
    const text = await file.text();
    const lines = text.split("\n");

    if (lines.length < 2) {
      return {
        file,
        provider: null,
        providerName: "Unknown",
        rowCount: 0,
        isValid: false,
        error: "File appears to be empty",
      };
    }

    // Skip title rows for ALD files
    let headerIndex = 0;
    if (lines[0]?.includes("Broker") || lines[0]?.includes("Generated")) {
      headerIndex = 1;
      // Skip count row if present
      if (lines[1] && !lines[1].includes(",")) {
        headerIndex = 2;
      }
    }

    headerLine = (lines[headerIndex] || "").toUpperCase();
    rowCount = lines.filter((l) => l.trim()).length - headerIndex - 1;

    // Detect provider based on headers
    let detectedProvider: string | null = null;
    let providerName = "Unknown Format";

    for (const [code, signature] of Object.entries(PROVIDER_SIGNATURES)) {
      const matchCount = signature.headers.filter((h) =>
        headerLine.includes(h.toUpperCase())
      ).length;

      // Need at least 2 matching headers to confirm provider
      if (matchCount >= 2) {
        detectedProvider = code;
        providerName = signature.name;
        break;
      }
    }

    return {
      file,
      provider: detectedProvider,
      providerName,
      rowCount,
      isValid: rowCount > 0,
    };
  } catch {
    return {
      file,
      provider: null,
      providerName: "Unknown",
      rowCount: 0,
      isValid: false,
      error: "Could not read file",
    };
  }
}

// Quick Action Card Component
function QuickActionCard({ icon, title, subtitle, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-1 bg-[#161c24] border border-gray-800 rounded-xl p-5 text-left
        hover:border-[#79d5e9]/30 hover:bg-[#79d5e9]/5 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-[#79d5e9]/10 text-[#79d5e9] group-hover:bg-[#79d5e9]/20 transition-colors">
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

// Import result type
interface ImportResult {
  fileName: string;
  success: boolean;
  totalRows: number;
  successRows: number;
  errorRows: number;
  uniqueCapCodes: number;
  errors: string[];
}

// Import Wizard Modal
function ImportWizard({ isOpen, onClose, onImportComplete }: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [files, setFiles] = useState<DetectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import processing state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const processFiles = useCallback(async (newFiles: FileList | File[]) => {
    setIsProcessingFiles(true);
    const fileArray = Array.from(newFiles);
    const csvFiles = fileArray.filter(
      (f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    const detectedFiles = await Promise.all(csvFiles.map(detectFileInfo));

    setFiles((prev) => {
      // Avoid duplicates by file name
      const existingNames = new Set(prev.map((f) => f.file.name));
      const newDetected = detectedFiles.filter((f) => !existingNames.has(f.file.name));
      return [...prev, ...newDetected];
    });
    setIsProcessingFiles(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        await processFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processFiles]
  );

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleContractType = (type: string) => {
    setContractTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Auto-set provider if all files are from the same provider
  useEffect(() => {
    if (files.length > 0 && !provider) {
      const providers = files.map((f) => f.provider).filter((p): p is string => p !== null);
      const uniqueProviders = Array.from(new Set(providers));
      if (uniqueProviders.length === 1 && uniqueProviders[0]) {
        setProvider(uniqueProviders[0]);
      }
    }
  }, [files, provider]);

  // Process imports when entering step 4
  const processImports = useCallback(async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportResults([]);
    setImportError(null);

    const results: ImportResult[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const detectedFile = files[i];
      setCurrentFileIndex(i);
      setImportProgress(Math.round((i / totalFiles) * 100));

      try {
        // Read file content - handle both CSV and XLSX
        const isXLSX = detectedFile.file.name.toLowerCase().endsWith(".xlsx") ||
                       detectedFile.file.name.toLowerCase().endsWith(".xls");

        let fileContent: string;
        if (isXLSX) {
          // Send XLSX as base64
          const arrayBuffer = await detectedFile.file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          fileContent = btoa(binary);
        } else {
          // Send CSV as text
          fileContent = await detectedFile.file.text();
        }

        // Process each contract type for this file
        for (const contractType of contractTypes) {
          const apiBase = getApiBaseUrl();
          const isLargeFile = fileContent.length > LARGE_FILE_THRESHOLD;

          if (isLargeFile && !isXLSX) {
            // Use chunked import for large CSV files
            const { chunks, headerRow } = splitCsvIntoChunks(fileContent);
            console.log(`Large file detected: ${detectedFile.file.name} - splitting into ${chunks.length} chunks`);

            let totalRows = 0;
            let successRows = 0;
            let errorRows = 0;
            let uniqueCapCodes = 0;
            const allErrors: string[] = [];
            let allSuccess = true;

            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
              const chunk = chunks[chunkIdx];
              const queryParams = new URLSearchParams({
                fileName: detectedFile.file.name,
                contractType,
                providerCode: provider,
                chunkIndex: chunkIdx.toString(),
                totalChunks: chunks.length.toString(),
                ...(chunkIdx > 0 && { headerRow: encodeURIComponent(headerRow) }),
              });

              try {
                const response = await fetch(`${apiBase}/api/admin/ratebooks/import-chunked?${queryParams}`, {
                  method: "POST",
                  headers: { "Content-Type": "text/plain" },
                  body: chunk,
                });

                const data = await response.json();

                if (!response.ok) {
                  allSuccess = false;
                  allErrors.push(`Chunk ${chunkIdx + 1}: ${data.error || "Failed"}`);
                } else {
                  totalRows += data.totalRows || 0;
                  successRows += data.successRows || 0;
                  errorRows += data.errorRows || 0;
                  uniqueCapCodes += data.uniqueCapCodes || 0;
                  if (data.errors?.length) {
                    allErrors.push(...data.errors.slice(0, 5));
                  }
                }

                // Update progress within this file
                const chunkProgress = ((chunkIdx + 1) / chunks.length) * 100;
                const fileProgress = (i / totalFiles) * 100;
                setImportProgress(Math.round(fileProgress + (chunkProgress / totalFiles)));
              } catch (err) {
                allSuccess = false;
                allErrors.push(`Chunk ${chunkIdx + 1}: ${err instanceof Error ? err.message : "Network error"}`);
              }
            }

            results.push({
              fileName: `${detectedFile.file.name} (${contractType})`,
              success: allSuccess && successRows > 0,
              totalRows,
              successRows,
              errorRows,
              uniqueCapCodes,
              errors: allErrors.slice(0, 10),
            });
          } else {
            // Standard import for smaller files
            const queryParams = new URLSearchParams({
              fileName: detectedFile.file.name,
              contractType,
              providerCode: provider,
            });

            const response = await fetch(`${apiBase}/api/admin/ratebooks/import-stream?${queryParams}`, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              body: fileContent,
            });

            const data = await response.json();

            if (!response.ok) {
              results.push({
                fileName: `${detectedFile.file.name} (${contractType})`,
                success: false,
                totalRows: 0,
                successRows: 0,
                errorRows: 0,
                uniqueCapCodes: 0,
                errors: [data.error || data.errors?.[0] || "Import failed"],
              });
            } else {
              results.push({
                fileName: `${detectedFile.file.name} (${contractType})`,
                success: data.success,
                totalRows: data.totalRows || data.stats?.totalRows || 0,
                successRows: data.successRows || data.stats?.successRows || 0,
                errorRows: data.errorRows || data.stats?.errorRows || 0,
                uniqueCapCodes: data.uniqueCapCodes || data.stats?.uniqueCapCodes || 0,
                errors: data.errors || [],
              });
            }
          }
        }
      } catch (error) {
        results.push({
          fileName: detectedFile.file.name,
          success: false,
          totalRows: 0,
          successRows: 0,
          errorRows: 0,
          uniqueCapCodes: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    setImportResults(results);
    setImportProgress(100);
    setIsImporting(false);
    onImportComplete?.();
  }, [files, contractTypes, provider, onImportComplete]);

  // Handle step change - trigger import when entering step 4
  const handleNextStep = useCallback(() => {
    if (step === 3) {
      setStep(4);
      processImports();
    } else {
      setStep(step + 1);
    }
  }, [step, processImports]);

  // Reset wizard state when closing
  const handleClose = useCallback(() => {
    setStep(1);
    setSourceType(null);
    setProvider("");
    setContractTypes([]);
    setFiles([]);
    setImportResults([]);
    setImportProgress(0);
    setIsImporting(false);
    setImportError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isImporting ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[#161c24] rounded-xl border border-gray-800 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">New Import</h2>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
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

        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-[#79d5e9] transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Source Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-4">What are you uploading?</p>

              {[
                {
                  id: "generic",
                  title: "Generic Ratebook",
                  desc: "Standard finance company discount terms (Lex, Ogilvie, Venus, etc.)",
                },
                {
                  id: "dealership",
                  title: "Dealership/3rd Party Special Rates",
                  desc: "Stock deals or enhanced discounts",
                },
                {
                  id: "custom",
                  title: "Custom Quote (Manual Entry)",
                  desc: "User-run quotes with specific discounts",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSourceType(option.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all",
                    sourceType === option.id
                      ? "border-[#79d5e9] bg-[#79d5e9]/10"
                      : "border-gray-800 hover:border-gray-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        sourceType === option.id
                          ? "border-[#79d5e9]"
                          : "border-gray-600"
                      )}
                    >
                      {sourceType === option.id && (
                        <div className="w-2 h-2 rounded-full bg-[#79d5e9]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{option.title}</p>
                      <p className="text-sm text-gray-500">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Provider & Contract Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1f2a] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#79d5e9]/50"
                >
                  <option value="">Select provider...</option>
                  <option value="ald">ALD Automotive</option>
                  <option value="drivalia">Drivalia</option>
                  <option value="lex">Lex Autolease</option>
                  <option value="ogilvie">Ogilvie Fleet</option>
                  <option value="venus">Venus Fleet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Contract Types in this file
                </label>
                <div className="space-y-2">
                  {[
                    { code: "CH", label: "Contract Hire with Maintenance" },
                    { code: "CHNM", label: "Contract Hire No Maintenance" },
                    { code: "PCH", label: "Personal Contract Hire" },
                    { code: "PCHNM", label: "Personal No Maintenance" },
                  ].map((type) => (
                    <button
                      key={type.code}
                      onClick={() => toggleContractType(type.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left",
                        contractTypes.includes(type.code)
                          ? "border-[#79d5e9] bg-[#79d5e9]/10"
                          : "border-gray-800 hover:border-gray-700"
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          contractTypes.includes(type.code)
                            ? "border-[#79d5e9] bg-[#79d5e9]"
                            : "border-gray-600"
                        )}
                      >
                        {contractTypes.includes(type.code) && (
                          <Check className="w-3 h-3 text-[#161c24]" />
                        )}
                      </div>
                      <div>
                        <span className="text-white font-medium">{type.code}</span>
                        <span className="text-gray-500 ml-2">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ALD info note */}
              {provider === "ald" && (
                <div className="p-4 bg-[#79d5e9]/5 border border-[#79d5e9]/20 rounded-lg">
                  <p className="text-sm text-[#79d5e9] font-medium mb-1">ALD Import</p>
                  <p className="text-xs text-gray-400">
                    ALD files contain all mileage bands (5k-30k) per vehicle. Term and mileage are read from the file data.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: File Upload */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Dropzone */}
              <div
                onClick={handleDropzoneClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                  isDragging
                    ? "border-[#79d5e9] bg-[#79d5e9]/10"
                    : files.length > 0
                    ? "border-gray-700 hover:border-[#79d5e9]/50"
                    : "border-gray-700 hover:border-gray-600"
                )}
              >
                {isProcessingFiles ? (
                  <div className="space-y-3">
                    <RefreshCw className="w-10 h-10 text-[#79d5e9] mx-auto animate-spin" />
                    <p className="text-gray-400">Processing files...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.length > 0 ? (
                      <>
                        <Plus className="w-8 h-8 text-[#79d5e9] mx-auto" />
                        <p className="text-white text-sm">Add more files</p>
                        <p className="text-xs text-gray-500">Drop or click to browse</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-500 mx-auto" />
                        <div>
                          <p className="text-white">Drop Excel or CSV files here</p>
                          <p className="text-sm text-gray-500">or click to browse</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((detectedFile, index) => (
                    <div
                      key={detectedFile.file.name}
                      className="flex items-center gap-3 p-3 bg-[#1a1f2a] rounded-lg group"
                    >
                      <FileSpreadsheet
                        className={cn(
                          "w-8 h-8 flex-shrink-0",
                          detectedFile.isValid ? "text-[#4d9869]" : "text-[#dd4444]"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {detectedFile.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded",
                              detectedFile.provider
                                ? "bg-[#79d5e9]/20 text-[#79d5e9]"
                                : "bg-gray-700 text-gray-400"
                            )}
                          >
                            {detectedFile.providerName}
                          </span>
                          <span className="text-gray-500">
                            {detectedFile.rowCount.toLocaleString()} rows
                          </span>
                          <span className="text-gray-600">
                            {(detectedFile.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        {detectedFile.error && (
                          <p className="text-xs text-[#dd4444] mt-1">{detectedFile.error}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1.5 text-gray-500 hover:text-[#dd4444] hover:bg-[#dd4444]/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {files.length > 0 && (
                <div className="flex items-center justify-between text-sm p-3 bg-[#161c24] border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      {files.length} file{files.length !== 1 ? "s" : ""} selected
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">
                      {files.reduce((sum, f) => sum + f.rowCount, 0).toLocaleString()} total rows
                    </span>
                  </div>
                  {files.every((f) => f.isValid) ? (
                    <span className="flex items-center gap-1.5 text-[#4d9869]">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to import
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[#f8d824]">
                      <AlertCircle className="w-4 h-4" />
                      Some files have issues
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {isImporting
                      ? `Processing file ${currentFileIndex + 1} of ${files.length}...`
                      : "Import complete"}
                  </span>
                  <span className="text-white">{importProgress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isImporting ? "bg-[#79d5e9]" : "bg-[#4d9869]"
                    )}
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>

              {/* Current file being processed */}
              {isImporting && files[currentFileIndex] && (
                <div className="flex items-center gap-3 p-3 bg-[#1a1f2a] rounded-lg">
                  <RefreshCw className="w-5 h-5 text-[#79d5e9] animate-spin" />
                  <span className="text-sm text-white truncate">
                    {files[currentFileIndex].file.name}
                  </span>
                </div>
              )}

              {/* Results */}
              {!isImporting && importResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border",
                        result.success
                          ? "bg-[#4d9869]/10 border-[#4d9869]/30"
                          : "bg-[#dd4444]/10 border-[#dd4444]/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-[#4d9869] flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[#dd4444] flex-shrink-0" />
                        )}
                        <span className="text-sm text-white font-medium truncate">
                          {result.fileName}
                        </span>
                      </div>
                      {result.success ? (
                        <div className="ml-6 mt-1 text-xs text-gray-400">
                          {result.successRows.toLocaleString()} rows imported •{" "}
                          {result.uniqueCapCodes.toLocaleString()} vehicles
                          {result.errorRows > 0 && (
                            <span className="text-[#f8d824]"> • {result.errorRows} warnings</span>
                          )}
                        </div>
                      ) : (
                        <div className="ml-6 mt-1 text-xs text-[#dd4444]">
                          {result.errors[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary stats */}
              {!isImporting && importResults.length > 0 && (
                <div className="p-4 bg-[#161c24] border border-gray-800 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {importResults.filter((r) => r.success).length}
                      </p>
                      <p className="text-xs text-gray-500">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#4d9869]">
                        {importResults
                          .reduce((sum, r) => sum + r.successRows, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Total Rows</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#79d5e9]">
                        {importResults
                          .reduce((sum, r) => sum + r.uniqueCapCodes, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Vehicles</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep(step - 1)}
              disabled={isImporting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 transition-colors",
                isImporting
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : step === 4 ? (
            <div /> // Empty placeholder for Done step
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleNextStep}
              disabled={
                (step === 1 && !sourceType) ||
                (step === 2 && (!provider || contractTypes.length === 0)) ||
                (step === 3 && files.length === 0)
              }
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                ((step === 1 && !sourceType) ||
                  (step === 2 && (!provider || contractTypes.length === 0)) ||
                  (step === 3 && files.length === 0))
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-[#79d5e9] text-[#161c24] hover:bg-[#4daeac]"
              )}
            >
              {step === 3 ? "Import" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleClose}
              disabled={isImporting}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                isImporting
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-[#4d9869] text-white hover:bg-[#3d7a55]"
              )}
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Provider name formatter
function formatProviderName(code: string): string {
  const names: Record<string, string> = {
    ald: "ALD Automotive",
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
  const [showWizard, setShowWizard] = useState(false);
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
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#79d5e9] text-[#161c24] rounded-lg font-medium hover:bg-[#4daeac] transition-colors"
        >
          <Upload className="w-4 h-4" />
          New Import
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<Upload className="w-5 h-5" />}
          title="Upload Ratebook"
          subtitle="CSV/Excel file"
          onClick={() => setShowWizard(true)}
        />
        <QuickActionCard
          icon={<RefreshCw className="w-5 h-5" />}
          title="Lex Session Sync"
          subtitle="Auto-fetch quotes"
          onClick={() => {}}
        />
        <QuickActionCard
          icon={<Globe className="w-5 h-5" />}
          title="Ogilvie Scrape"
          subtitle="Export from portal"
          onClick={() => {}}
        />
        <QuickActionCard
          icon={<FileText className="w-5 h-5" />}
          title="Custom Quote Entry"
          subtitle="Manual input"
          onClick={() => {}}
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
                onChange={(e) =>
                  setFilters((f) => ({ ...f, source: e.target.value }))
                }
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
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
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
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateRange: e.target.value }))
                }
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
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
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
                          <span className="text-xs text-gray-500">
                            {imp.contractType}
                          </span>
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
                          <span className="text-sm text-[#dd4444]">
                            {imp.errorRows}
                          </span>
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
            <p className="text-sm text-gray-500">
              Showing {filteredImports.length} imports
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors">
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-[#79d5e9]/20 text-[#79d5e9] rounded">
                1
              </span>
              <button className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Wizard Modal */}
      <ImportWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onImportComplete={fetchImports}
      />
    </div>
  );
}
