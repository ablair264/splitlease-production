"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, Loader2, CheckCircle, XCircle, Download, Clock } from "lucide-react";

type ExportProgress = {
  status: string;
  currentPage: number;
  totalPages: number;
  vehiclesProcessed: number;
};

type JobStatus = {
  jobId: string;
  status: "running" | "completed" | "failed";
  currentConfigIndex: number;
  totalConfigs: number;
  currentProgress: ExportProgress | null;
  results: Array<{
    config: { contractTerm: number; contractMileage: number };
    success: boolean;
    batchId?: string;
    error?: string;
  }>;
  startedAt: string;
  completedAt?: string;
  error?: string;
};

type ExportProgressModalProps = {
  isOpen: boolean;
  onClose: () => void;
  configs: Array<{ contractTerm: number; contractMileage: number; manufacturerIds?: number[] }>;
  onComplete?: (results: Array<{ batchId?: string; success: boolean }>) => void;
};

export function ExportProgressModal({ isOpen, onClose, configs, onComplete }: ExportProgressModalProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isComplete = jobStatus?.status === "completed" || jobStatus?.status === "failed";

  // Start the export job
  const startExport = useCallback(async () => {
    try {
      setError(null);
      setJobId(null);
      setJobStatus(null);
      setStartTime(Date.now());
      setElapsed(0);

      const response = await fetch("/api/admin/ogilvie/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to start export");
        return;
      }

      setJobId(data.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start export");
    }
  }, [configs]);

  // Poll for status
  const pollStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/admin/ogilvie/stream?jobId=${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to get status");
        return;
      }

      setJobStatus(data);

      // If complete, stop polling and notify parent
      if (data.status === "completed" || data.status === "failed") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onComplete?.(data.results);
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, [jobId, onComplete]);

  // Start export when modal opens
  useEffect(() => {
    if (isOpen && configs.length > 0) {
      startExport();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, configs, startExport]);

  // Start polling when we have a job ID
  useEffect(() => {
    if (jobId && !pollIntervalRef.current) {
      // Poll immediately
      pollStatus();
      // Then poll every 2 seconds
      pollIntervalRef.current = setInterval(pollStatus, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId, pollStatus]);

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

  const getStatusText = (status: string) => {
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
    if (!jobStatus) return 0;
    if (jobStatus.status === "completed") return 100;
    if (jobStatus.status === "failed") return 0;

    const progress = jobStatus.currentProgress;
    if (!progress || progress.totalPages === 0) {
      // Base progress on config index alone
      return (jobStatus.currentConfigIndex / jobStatus.totalConfigs) * 100;
    }

    const configProgress = progress.totalPages > 0
      ? (progress.currentPage / progress.totalPages) * 100
      : 0;
    const overallProgress = ((jobStatus.currentConfigIndex + (configProgress / 100)) / jobStatus.totalConfigs) * 100;
    return Math.min(overallProgress, 99);
  };

  const currentConfig = configs[jobStatus?.currentConfigIndex ?? 0];

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
            {isComplete ? (jobStatus?.status === "failed" ? "Export Failed" : "Export Complete") : "Exporting Ogilvie Data"}
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

          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Current Status */}
          {jobStatus && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">
                  {jobStatus.currentProgress ? getStatusText(jobStatus.currentProgress.status) : "Starting..."}
                </span>
                <span className="text-sm text-white/50">
                  Config {jobStatus.currentConfigIndex + 1} of {jobStatus.totalConfigs}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${getProgressPercent()}%`,
                    background: jobStatus.status === "failed"
                      ? "#ef4444"
                      : jobStatus.status === "completed"
                        ? "#22c55e"
                        : "linear-gradient(90deg, #79d5e9 0%, #4daeac 100%)",
                  }}
                />
              </div>

              {/* Details */}
              {currentConfig && (
                <div className="mt-3 text-xs text-white/40 text-center">
                  {currentConfig.contractTerm} months / {currentConfig.contractMileage.toLocaleString()} miles
                  {jobStatus.currentProgress && jobStatus.currentProgress.totalPages > 0 && (
                    <span className="ml-2">
                      • Page {jobStatus.currentProgress.currentPage} of {jobStatus.currentProgress.totalPages}
                    </span>
                  )}
                </div>
              )}

              {jobStatus.currentProgress && jobStatus.currentProgress.vehiclesProcessed > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-2xl font-bold text-white">
                    {jobStatus.currentProgress.vehiclesProcessed.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/50 ml-2">vehicles processed</span>
                </div>
              )}

              {jobStatus.error && (
                <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">{jobStatus.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state before job starts */}
          {!jobStatus && !error && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-[#79d5e9] animate-spin mb-4" />
              <span className="text-white/60">Starting export...</span>
            </div>
          )}

          {/* Results */}
          {jobStatus && jobStatus.results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                Results
              </h4>
              {jobStatus.results.map((r, i) => (
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
                      href={`/api/admin/ogilvie/download/${r.batchId}`}
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
