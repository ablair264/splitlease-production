"use client";

import { useState, useEffect } from "react";
import { Play, CheckCircle, Filter, Loader2 } from "lucide-react";
import { ExportProgressModal } from "./export-progress-modal";

type ExportConfig = {
  contractTerm: number;
  contractMileage: number;
  enabled: boolean;
};

type Manufacturer = {
  id: number;
  name: string;
};

type ExportFormProps = {
  sessionValid: boolean;
  onExportComplete?: () => void;
};

const DEFAULT_CONFIGS: ExportConfig[] = [
  { contractTerm: 24, contractMileage: 20000, enabled: true },
  { contractTerm: 36, contractMileage: 30000, enabled: true },
  { contractTerm: 48, contractMileage: 40000, enabled: true },
];

// Common manufacturer IDs for quick testing
const QUICK_TEST_MANUFACTURERS = [
  { id: 31, name: "BMW" },
  { id: 7, name: "Audi" },
  { id: 88, name: "Mercedes-Benz" },
  { id: 147, name: "Volkswagen" },
  { id: 142, name: "Toyota" },
  { id: 52, name: "Ford" },
];

export function OgilvieExportForm({ sessionValid, onExportComplete }: ExportFormProps) {
  const [configs, setConfigs] = useState<ExportConfig[]>(DEFAULT_CONFIGS);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<number[]>([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [showManufacturerFilter, setShowManufacturerFilter] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Load manufacturers when session becomes valid
  useEffect(() => {
    if (sessionValid && manufacturers.length === 0) {
      loadManufacturers();
    }
  }, [sessionValid, manufacturers.length]);

  const loadManufacturers = async () => {
    setLoadingManufacturers(true);
    try {
      // Use internal proxy route instead of direct Railway call
      const response = await fetch("/api/admin/ogilvie?action=manufacturers");
      const data = await response.json();
      if (data.manufacturers) {
        setManufacturers(data.manufacturers);
      }
    } catch (error) {
      console.error("Failed to load manufacturers:", error);
      setManufacturers(QUICK_TEST_MANUFACTURERS);
    } finally {
      setLoadingManufacturers(false);
    }
  };

  const toggleManufacturer = (id: number) => {
    setSelectedManufacturers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectQuickTest = () => {
    setSelectedManufacturers([31]);
  };

  const toggleConfig = (index: number) => {
    setConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const selectedConfigs = configs.filter((c) => c.enabled);

  const getExportConfigs = () => {
    return selectedConfigs.map(({ contractTerm, contractMileage }) => ({
      contractTerm,
      contractMileage,
      manufacturerIds: selectedManufacturers.length > 0 ? selectedManufacturers : undefined,
    }));
  };

  const handleExportClick = () => {
    if (!sessionValid || selectedConfigs.length === 0) return;
    setShowProgressModal(true);
  };

  const handleExportComplete = () => {
    onExportComplete?.();
  };

  return (
    <>
      <div
        className="rounded-xl p-5 border"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <h3 className="text-sm font-semibold text-white/90 mb-4">Export Configurations</h3>

        <p className="text-xs text-white/50 mb-4">
          Select which contract term / mileage combinations to export.
          {selectedManufacturers.length === 0
            ? " All manufacturers (~4000 vehicles) will be exported."
            : ` Filtering to ${selectedManufacturers.length} manufacturer(s).`}
        </p>

        {/* Manufacturer Filter */}
        <div className="mb-4">
          <button
            onClick={() => setShowManufacturerFilter(!showManufacturerFilter)}
            className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 transition-colors"
          >
            <Filter className="h-3 w-3" />
            {showManufacturerFilter ? "Hide" : "Show"} Manufacturer Filter
            {selectedManufacturers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#79d5e9]/20 text-[#79d5e9]">
                {selectedManufacturers.length} selected
              </span>
            )}
          </button>

          {showManufacturerFilter && (
            <div
              className="mt-3 p-3 rounded-lg"
              style={{
                background: "rgba(15, 20, 25, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">Quick actions:</span>
                <div className="flex gap-2">
                  <button
                    onClick={selectQuickTest}
                    className="text-xs px-2 py-1 rounded bg-[#79d5e9]/10 text-[#79d5e9] hover:bg-[#79d5e9]/20"
                  >
                    BMW only (quick test)
                  </button>
                  <button
                    onClick={() => setSelectedManufacturers([])}
                    className="text-xs px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {loadingManufacturers ? (
                <div className="flex items-center gap-2 text-xs text-white/50 py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading manufacturers...
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                  {(manufacturers.length > 0 ? manufacturers : QUICK_TEST_MANUFACTURERS).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleManufacturer(m.id)}
                      className="text-xs px-2 py-1.5 rounded text-left transition-colors truncate"
                      style={{
                        background: selectedManufacturers.includes(m.id)
                          ? "rgba(121, 213, 233, 0.2)"
                          : "rgba(255, 255, 255, 0.03)",
                        border: `1px solid ${
                          selectedManufacturers.includes(m.id)
                            ? "rgba(121, 213, 233, 0.4)"
                            : "rgba(255, 255, 255, 0.05)"
                        }`,
                        color: selectedManufacturers.includes(m.id) ? "#79d5e9" : "rgba(255,255,255,0.6)",
                      }}
                      title={m.name}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Config Selection */}
        <div className="space-y-3 mb-6">
          {configs.map((config, index) => (
            <button
              key={index}
              onClick={() => toggleConfig(index)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                background: config.enabled
                  ? "rgba(121, 213, 233, 0.1)"
                  : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${
                  config.enabled ? "rgba(121, 213, 233, 0.3)" : "rgba(255, 255, 255, 0.1)"
                }`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{
                    background: config.enabled ? "#79d5e9" : "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {config.enabled && <CheckCircle className="h-3 w-3 text-[#0f1419]" />}
                </div>
                <span className={config.enabled ? "text-white" : "text-white/50"}>
                  {config.contractTerm} months / {config.contractMileage.toLocaleString()} miles
                </span>
              </div>
              <span className="text-xs text-white/40">
                {config.contractMileage / (config.contractTerm / 12)} miles/year
              </span>
            </button>
          ))}
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportClick}
            disabled={!sessionValid || selectedConfigs.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #79d5e9 0%, #4daeac 100%)",
              color: "#0f1419",
            }}
          >
            <Play className="h-4 w-4" />
            Run Export ({selectedConfigs.length} config{selectedConfigs.length !== 1 ? "s" : ""})
          </button>

          {!sessionValid && (
            <span className="text-xs text-amber-400">Please login first</span>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      <ExportProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        configs={getExportConfigs()}
        onComplete={handleExportComplete}
      />
    </>
  );
}
