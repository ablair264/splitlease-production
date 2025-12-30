"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  DollarSign,
  Percent,
  Calendar,
  AlertTriangle,
  Save,
  Trash2,
} from "lucide-react";
import type { PriceOverride, PriceOverrideType } from "@/app/api/admin/price-overrides/route";

interface PriceOverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  // Pre-fill values when creating from vehicle context
  capCode?: string;
  providerCode?: string;
  contractType?: string;
  term?: number;
  mileage?: number;
  vehicleInfo?: {
    manufacturer: string;
    model: string;
    variant?: string;
  };
  // For editing existing override
  existingOverride?: PriceOverride;
}

const OVERRIDE_TYPES: { value: PriceOverrideType; label: string; description: string }[] = [
  {
    value: "fixed",
    label: "Fixed Price",
    description: "Set a specific monthly price (replaces calculated price)",
  },
  {
    value: "percentage",
    label: "Percentage Adjustment",
    description: "Adjust price by a percentage (+/- from current)",
  },
  {
    value: "absolute",
    label: "Absolute Adjustment",
    description: "Add or subtract a fixed amount from price",
  },
];

const CONTRACT_TYPES = [
  { value: "", label: "All contract types" },
  { value: "CH", label: "Contract Hire" },
  { value: "CHNM", label: "Contract Hire (No Maint)" },
  { value: "PCH", label: "Personal Contract Hire" },
  { value: "PCHNM", label: "Personal CH (No Maint)" },
  { value: "BSSNL", label: "Salary Sacrifice" },
];

const PROVIDERS = [
  { value: "", label: "All funders" },
  { value: "lex", label: "Lex Autolease" },
  { value: "ogilvie", label: "Ogilvie Fleet" },
  { value: "venus", label: "Venus" },
  { value: "drivalia", label: "Drivalia" },
];

const TERMS = [
  { value: 0, label: "All terms" },
  { value: 24, label: "24 months" },
  { value: 36, label: "36 months" },
  { value: 48, label: "48 months" },
  { value: 60, label: "60 months" },
];

const MILEAGES = [
  { value: 0, label: "All mileages" },
  { value: 5000, label: "5,000 mi" },
  { value: 8000, label: "8,000 mi" },
  { value: 10000, label: "10,000 mi" },
  { value: 15000, label: "15,000 mi" },
  { value: 20000, label: "20,000 mi" },
  { value: 30000, label: "30,000 mi" },
];

export function PriceOverrideDialog({
  isOpen,
  onClose,
  onSave,
  capCode: initialCapCode,
  providerCode: initialProviderCode,
  contractType: initialContractType,
  term: initialTerm,
  mileage: initialMileage,
  vehicleInfo,
  existingOverride,
}: PriceOverrideDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [capCode, setCapCode] = useState(initialCapCode || "");
  const [providerCode, setProviderCode] = useState(initialProviderCode || "");
  const [contractType, setContractType] = useState(initialContractType || "");
  const [term, setTerm] = useState(initialTerm || 0);
  const [annualMileage, setAnnualMileage] = useState(initialMileage || 0);
  const [overrideType, setOverrideType] = useState<PriceOverrideType>("fixed");
  const [overrideValue, setOverrideValue] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);

  // Initialize form from existing override
  useEffect(() => {
    if (existingOverride) {
      setCapCode(existingOverride.capCode || "");
      setProviderCode(existingOverride.providerCode || "");
      setContractType(existingOverride.contractType || "");
      setTerm(existingOverride.term || 0);
      setAnnualMileage(existingOverride.annualMileage || 0);
      setOverrideType(existingOverride.overrideType);
      setOverrideValue(existingOverride.overrideValueGbp);
      setReason(existingOverride.reason || "");
      setInternalNotes(existingOverride.internalNotes || "");
      setValidUntil(
        existingOverride.validUntil
          ? new Date(existingOverride.validUntil).toISOString().split("T")[0]
          : ""
      );
      setIsActive(existingOverride.isActive);
      setPriority(existingOverride.priority);
    } else {
      // Reset to defaults with initial values
      setCapCode(initialCapCode || "");
      setProviderCode(initialProviderCode || "");
      setContractType(initialContractType || "");
      setTerm(initialTerm || 0);
      setAnnualMileage(initialMileage || 0);
      setOverrideType("fixed");
      setOverrideValue(0);
      setReason("");
      setInternalNotes("");
      setValidUntil("");
      setIsActive(true);
      setPriority(0);
    }
  }, [existingOverride, initialCapCode, initialProviderCode, initialContractType, initialTerm, initialMileage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = {
        id: existingOverride?.id,
        capCode: capCode || null,
        providerCode: providerCode || null,
        contractType: contractType || null,
        term: term || null,
        annualMileage: annualMileage || null,
        overrideType,
        overrideValueGbp: overrideValue,
        reason: reason || null,
        internalNotes: internalNotes || null,
        validUntil: validUntil || null,
        isActive,
        priority,
      };

      const res = await fetch("/api/admin/price-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save override");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingOverride?.id) return;
    if (!confirm("Are you sure you want to delete this price override?")) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/price-overrides?id=${existingOverride.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete override");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl"
        style={{
          background: "linear-gradient(180deg, #1a1f2a 0%, #0f1419 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 border-b border-white/10 bg-[#1a1f2a] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {existingOverride ? "Edit Price Override" : "Create Price Override"}
            </h2>
            {vehicleInfo && (
              <p className="text-sm text-white/50">
                {vehicleInfo.manufacturer} {vehicleInfo.model}
                {vehicleInfo.variant && ` - ${vehicleInfo.variant}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Target Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
              Override Target
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* CAP Code */}
              <div>
                <label className="block text-sm text-white/60 mb-1">CAP Code</label>
                <input
                  type="text"
                  value={capCode}
                  onChange={(e) => setCapCode(e.target.value)}
                  placeholder="All vehicles"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm text-white/60 mb-1">Funder</label>
                <select
                  value={providerCode}
                  onChange={(e) => setProviderCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-[#1a1f2a]">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Type */}
              <div>
                <label className="block text-sm text-white/60 mb-1">Contract Type</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#1a1f2a]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm text-white/60 mb-1">Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {TERMS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#1a1f2a]">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mileage */}
              <div>
                <label className="block text-sm text-white/60 mb-1">Annual Mileage</label>
                <select
                  value={annualMileage}
                  onChange={(e) => setAnnualMileage(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  {MILEAGES.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#1a1f2a]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Override Type */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
              Override Type
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {OVERRIDE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOverrideType(type.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    overrideType === type.value
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {type.value === "percentage" ? (
                      <Percent className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs opacity-70">{type.description}</p>
                </button>
              ))}
            </div>

            {/* Override Value */}
            <div>
              <label className="block text-sm text-white/60 mb-1">
                {overrideType === "percentage"
                  ? "Percentage Adjustment (%)"
                  : overrideType === "fixed"
                  ? "Fixed Monthly Price (£)"
                  : "Amount to Add/Subtract (£)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  {overrideType === "percentage" ? "%" : "£"}
                </span>
                <input
                  type="number"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(parseFloat(e.target.value) || 0)}
                  step={overrideType === "percentage" ? "1" : "0.01"}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              {overrideType === "percentage" && (
                <p className="text-xs text-white/40 mt-1">
                  Use negative values to reduce price (e.g., -10 for 10% discount)
                </p>
              )}
              {overrideType === "absolute" && (
                <p className="text-xs text-white/40 mt-1">
                  Use negative values to reduce price (e.g., -50 to subtract £50)
                </p>
              )}
            </div>
          </div>

          {/* Reason & Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
              Documentation
            </h3>

            <div>
              <label className="block text-sm text-white/60 mb-1">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Competitive price match, Promotional discount"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Internal Notes</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Additional notes (not visible to customers)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>
          </div>

          {/* Validity */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
              Validity
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Valid Until</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <p className="text-xs text-white/40 mt-1">Leave empty for no expiry</p>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1">Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-xs text-white/40 mt-1">Higher priority takes precedence</p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
              />
              <span className="text-sm text-white/60">Override is active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {existingOverride ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {existingOverride ? "Update" : "Create"} Override
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
