"use client";

import { useState, useRef } from "react";

interface RatebookUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
  { value: "ald", label: "ALD Automotive" },
];

export function RatebookUploadModal({ isOpen, onClose, onSuccess }: RatebookUploadModalProps) {
  const [provider, setProvider] = useState("");
  const [contractType, setContractType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    stats?: { totalRows: number; successRows: number; errorRows: number };
    errors?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!provider || !contractType || !file) {
      setError("Please select provider, contract type, and file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const csvContent = await file.text();

      // Use splitlease-api for imports (supports large files via streaming)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://splitfin-broker-production.up.railway.app";
      const queryParams = new URLSearchParams({
        fileName: file.name,
        contractType,
        providerCode: provider,
      });

      const res = await fetch(`${apiBase}/api/admin/ratebooks/import-stream?${queryParams}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvContent,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.errors?.[0] || "Upload failed");
        return;
      }

      setResult({
        success: data.success,
        stats: {
          totalRows: data.totalRows,
          successRows: data.successRows,
          errorRows: data.errorRows,
        },
        errors: data.errors,
      });

      if (data.success && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setProvider("");
    setContractType("");
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl shadow-2xl"
        style={{
          background: "rgba(15, 20, 25, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <h2 className="text-lg font-semibold text-white">Upload Ratebook</h2>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Provider Select */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Finance Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
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
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
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
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="px-4 py-6 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-white/40">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm">Click to select CSV file</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm text-red-400"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${result.success ? "text-green-400" : "text-red-400"}`}
              style={{ background: result.success ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)" }}
            >
              {result.success ? (
                <div>
                  <div className="font-medium mb-1">Upload successful!</div>
                  {result.stats && (
                    <div className="text-white/60 text-xs space-y-0.5">
                      <div>Total rows: {result.stats.totalRows.toLocaleString()}</div>
                      <div>Success: {result.stats.successRows.toLocaleString()}</div>
                      {result.stats.errorRows > 0 && (
                        <div className="text-red-400">Errors: {result.stats.errorRows.toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>Upload failed</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            {result?.success ? "Close" : "Cancel"}
          </button>
          {!result?.success && (
            <button
              onClick={handleUpload}
              disabled={isUploading || !provider || !contractType || !file}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isUploading ? "rgba(121, 213, 233, 0.5)" : "rgba(121, 213, 233, 0.8)",
              }}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Upload"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
