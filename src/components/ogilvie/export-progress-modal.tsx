"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle, XCircle, Download, Clock } from "lucide-react";

type ExportProgress = {
  status: "preparing" | "exporting" | "downloading" | "inserting" | "completed" | "error";
  currentPage: number;
  totalPages: number;
  vehiclesProcessed: number;
  configIndex: number;
  totalConfigs: number;
  currentConfig?: { contractTerm: number; contractMileage: number };
  error?: string;
  batchId?: string;
};

type ExportProgressModalProps = {
  isOpen: boolean;
  onClose: () => void;
  configs: Array<{ contractTerm: number; contractMileage: number; manufacturerIds?: number[] }>;
  onComplete?: (results: Array<{ batchId?: string; success: boolean }>) => void;
};

export function ExportProgressModal({ isOpen, onClose, configs, onComplete }: ExportProgressModalProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [results, setResults] = useState<Array<{ config: { contractTerm: number; contractMileage: number }; batchId?: string; success: boolean; error?: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen || configs.length === 0) return;

    setProgress(null);
    setResults([]);
    setIsComplete(false);
    setStartTime(Date.now());
    setElapsed(0);

    // Start the export with SSE
    const eventSource = new EventSource(
      `/api/ogilvie/export/stream?configs=${encodeURIComponent(JSON.stringify(configs))}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "progress") {
          setProgress(data.progress);
        } else if (data.type === "configComplete") {
          setResults((prev) => [...prev, data.result]);
        } else if (data.type === "complete") {
          setIsComplete(true);
          eventSource.close();
          onComplete?.(data.results);
        } else if (data.type === "error") {
          setProgress((prev) => prev ? { ...prev, status: "error", error: data.error } : null);
          eventSource.close();
        }
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setProgress((prev) => prev ? { ...prev, status: "error", error: "Connection lost" } : null);
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, configs]);

  // Update elapsed time
  useEffect(() => {
    if (!startTime || isComplete) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isComplete]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = (status: ExportProgress["status"]) => {
    switch (status) {
      case "preparing": return "Preparing export...";
      case "exporting": return "Exporting vehicle data...";
      case "downloading": return "Downloading CSV...";
      case "inserting": return "Saving to database...";
      case "completed": return "Export complete!";
      case "error": return "Export failed";
      default: return "Processing...";
    }
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    if (progress.status === "completed") return 100;
    if (progress.totalPages === 0) return 0;

    const configProgress = progress.totalPages > 0
      ? (progress.currentPage / progress.totalPages) * 100
      : 0;
    const overallProgress = ((progress.configIndex + (configProgress / 100)) / progress.totalConfigs) * 100;
    return Math.min(overallProgress, 99);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isComplete ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(26, 31, 42, 0.98) 0%, rgba(15, 20, 25, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            {isComplete ? "Export Complete" : "Exporting Ogilvie Data"}
          </h3>
          {isComplete && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5 text-white/60" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-5 py-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-6 text-white/50">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono">{formatTime(elapsed)}</span>
          </div>

          {/* Current Status */}
          {progress && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">
                  {getStatusText(progress.status)}
                </span>
                <span className="text-sm text-white/50">
                  Config {progress.configIndex + 1} of {progress.totalConfigs}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${getProgressPercent()}%`,
                    background: progress.status === "error"
                      ? "#ef4444"
                      : progress.status === "completed"
                        ? "#22c55e"
                        : "linear-gradient(90deg, #79d5e9 0%, #4daeac 100%)",
                  }}
                />
              </div>

              {/* Details */}
              {progress.currentConfig && (
                <div className="mt-3 text-xs text-white/40 text-center">
                  {progress.currentConfig.contractTerm} months / {progress.currentConfig.contractMileage.toLocaleString()} miles
                  {progress.totalPages > 0 && (
                    <span className="ml-2">
                      • Page {progress.currentPage} of {progress.totalPages}
                    </span>
                  )}
                </div>
              )}

              {progress.vehiclesProcessed > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-white">
                    {progress.vehiclesProcessed.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/50 ml-2">vehicles processed</span>
                </div>
              )}

              {progress.error && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">{progress.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state before progress starts */}
          {!progress && !isComplete && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-[#79d5e9] animate-spin mb-4" />
              <span className="text-white/60">Starting export...</span>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                Results
              </h4>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{
                    background: "rgba(15, 20, 25, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm text-white/70">
                      {r.config.contractTerm}m / {r.config.contractMileage.toLocaleString()} mi
                    </span>
                  </div>
                  {r.success && r.batchId && (
                    <a
                      href={`/api/ogilvie/exports/${r.batchId}?download=true`}
                      className="flex items-center gap-1 text-xs text-[#79d5e9] hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      CSV
                    </a>
                  )}
                  {!r.success && r.error && (
                    <span className="text-xs text-red-400">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="px-5 py-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)",
                color: "#0f1419",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
