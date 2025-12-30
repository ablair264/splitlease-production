"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface UploadResult {
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

export default function UploadContent() {
  const [file, setFile] = useState<File | null>(null);
  const [providerCode, setProviderCode] = useState("");
  const [contractType, setContractType] = useState("CHNM");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !providerCode) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("providerCode", providerCode);
      formData.append("contractType", contractType);

      const res = await fetch("/api/admin/ratebooks", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        setFile(null);
        setProviderCode("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      setResult({ success: false, errors: ["Upload failed"] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h2 className="text-xl font-semibold text-white">Upload Ratebook</h2>
        <p className="text-white/50 text-sm mt-1">
          Import CSV or Excel ratebooks from funders
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
              <div className="text-left">
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-white/50 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">Drop a CSV or Excel file here</p>
              <p className="text-white/40 text-sm mt-1">or click to browse</p>
            </>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Provider Code</label>
            <input
              type="text"
              value={providerCode}
              onChange={(e) => setProviderCode(e.target.value.toUpperCase())}
              placeholder="e.g. LEX, OGV"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Contract Type</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-[#1a1f2a]">
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || !providerCode || uploading}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-white/10 disabled:text-white/30 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
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

        {/* Result */}
        {result && (
          <div
            className={`p-4 rounded-lg ${
              result.success ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={result.success ? "text-green-400" : "text-red-400"}>
                {result.success ? "Upload successful" : "Upload failed"}
              </span>
            </div>
            {result.stats && (
              <p className="text-white/60 text-sm">
                {result.stats.successRows} of {result.stats.totalRows} rows imported
                {result.stats.errorRows > 0 && ` (${result.stats.errorRows} errors)`}
              </p>
            )}
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 text-sm text-red-400/80 list-disc list-inside">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
