"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronDown,
  Save,
} from "lucide-react";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number;
  reasoning: string;
}

interface AnalysisResult {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  missingRequiredFields: string[];
  suggestedProviderName: string;
}

interface DatabaseField {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: Record<string, string | null>, providerName: string, saveConfig: boolean) => void;
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  existingProviderName?: string;
}

export default function ColumnMappingModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  headers,
  sampleRows,
  existingProviderName,
}: ColumnMappingModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [availableFields, setAvailableFields] = useState<DatabaseField[]>([]);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [providerName, setProviderName] = useState(existingProviderName || "");
  const [saveConfig, setSaveConfig] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analyze columns when modal opens
  useEffect(() => {
    if (isOpen && headers.length > 0 && !analysis) {
      analyzeColumns();
    }
  }, [isOpen, headers]);

  const analyzeColumns = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiBase}/api/admin/providers/analyze-columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers,
          sampleRows,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze columns");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setAvailableFields(data.availableFields);

      // Initialize mappings from analysis
      const initialMappings: Record<string, string | null> = {};
      for (const mapping of data.analysis.mappings) {
        initialMappings[mapping.sourceColumn] = mapping.targetField;
      }
      setMappings(initialMappings);

      // Set suggested provider name if not already set
      if (!providerName && data.analysis.suggestedProviderName) {
        setProviderName(data.analysis.suggestedProviderName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: string | null) => {
    setMappings((prev) => ({
      ...prev,
      [sourceColumn]: targetField === "" ? null : targetField,
    }));
  };

  const getMappedFields = () => {
    return Object.values(mappings).filter(Boolean);
  };

  const getMissingRequired = () => {
    const mapped = getMappedFields();
    return availableFields
      .filter((f) => f.required && !mapped.includes(f.key))
      .map((f) => f.key);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    if (confidence >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500/20 border-green-500/30";
    if (confidence >= 60) return "bg-yellow-500/20 border-yellow-500/30";
    if (confidence >= 40) return "bg-orange-500/20 border-orange-500/30";
    return "bg-red-500/20 border-red-500/30";
  };

  const handleConfirm = () => {
    const missing = getMissingRequired();
    if (missing.length > 0) {
      setError(`Please map required fields: ${missing.join(", ")}`);
      return;
    }
    if (!providerName.trim()) {
      setError("Please enter a provider name");
      return;
    }
    onConfirm(mappings, providerName, saveConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
        style={{
          background: "rgba(26, 31, 42, 0.98)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Column Mapping</h2>
              <p className="text-sm text-white/50">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
              <p className="text-white/60">Analyzing column headers with AI...</p>
            </div>
          ) : error && !analysis ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={analyzeColumns}
                className="mt-4 px-4 py-2 rounded-lg text-sm text-white bg-cyan-600 hover:bg-cyan-500"
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Provider Name Input */}
              <div className="mb-6">
                <label className="block text-sm text-white/60 mb-2">Provider Name</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g., Zenith Fleet, Arval, ALD Automotive"
                  className="w-full px-4 py-2.5 rounded-lg text-white text-sm"
                  style={{
                    background: "rgba(26, 31, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                />
              </div>

              {/* Missing Required Fields Warning */}
              {getMissingRequired().length > 0 && (
                <div
                  className="mb-6 px-4 py-3 rounded-lg flex items-start gap-3"
                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Missing Required Mappings</p>
                    <p className="text-sm text-red-300/80 mt-1">
                      Please map columns for: {getMissingRequired().join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Column Mappings Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-white/40 uppercase tracking-wide">
                  <div className="col-span-4">Source Column</div>
                  <div className="col-span-4">Maps To</div>
                  <div className="col-span-2">Confidence</div>
                  <div className="col-span-2">Sample</div>
                </div>

                {headers.map((header) => {
                  const analysisMapping = analysis?.mappings.find((m) => m.sourceColumn === header);
                  const confidence = analysisMapping?.confidence || 0;
                  const currentMapping = mappings[header];
                  const sampleValue = sampleRows[0]?.[header] || "";

                  return (
                    <div
                      key={header}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border ${getConfidenceBg(confidence)}`}
                    >
                      {/* Source Column */}
                      <div className="col-span-4 flex items-center">
                        <span className="text-sm text-white font-medium truncate" title={header}>
                          {header}
                        </span>
                      </div>

                      {/* Target Field Dropdown */}
                      <div className="col-span-4">
                        <div className="relative">
                          <select
                            value={currentMapping || ""}
                            onChange={(e) => handleMappingChange(header, e.target.value)}
                            className="w-full appearance-none px-3 py-1.5 pr-8 rounded-md text-sm text-white cursor-pointer"
                            style={{
                              background: "rgba(0, 0, 0, 0.3)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <option value="">-- Don&apos;t import --</option>
                            {availableFields.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.label} {field.required ? "*" : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                      </div>

                      {/* Confidence */}
                      <div className="col-span-2 flex items-center">
                        {confidence > 0 ? (
                          <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                            {confidence}%
                          </span>
                        ) : (
                          <span className="text-sm text-white/30">-</span>
                        )}
                      </div>

                      {/* Sample Value */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-xs text-white/50 truncate" title={sampleValue}>
                          {sampleValue || "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save Configuration Checkbox */}
              <div className="mt-6 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveConfig}
                    onChange={(e) => setSaveConfig(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-white/70">
                    Save this configuration for future {providerName || "provider"} uploads
                  </span>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mt-4 px-4 py-3 rounded-lg text-sm text-red-400 flex items-center gap-2"
                  style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="text-sm text-white/40">
            {headers.length} columns • {getMappedFields().length} mapped
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isAnalyzing || getMissingRequired().length > 0}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)",
              }}
            >
              {saveConfig && <Save className="w-4 h-4" />}
              <Check className="w-4 h-4" />
              Confirm & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
