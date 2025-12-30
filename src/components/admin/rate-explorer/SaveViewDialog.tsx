"use client";

import { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { VisibilityState, ColumnOrderState } from "@tanstack/react-table";
import type { TableFilters, SortState } from "./types";

interface SaveViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  filters: TableFilters;
  sort: SortState;
}

export function SaveViewDialog({
  isOpen,
  onClose,
  onSaved,
  columnOrder,
  columnVisibility,
  filters,
  sort,
}: SaveViewDialogProps) {
  const [viewName, setViewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!viewName.trim()) {
      setError("Please enter a view name");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/user-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewName: viewName.trim(),
          tableId: "rate-explorer",
          columnOrder,
          columnVisibility,
          filters,
          sortBy: sort.field,
          sortOrder: sort.order,
          isDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save view");
      }

      // Reset and close
      setViewName("");
      setIsDefault(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save view");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md mx-4 rounded-xl p-6"
        style={{
          background: "linear-gradient(180deg, rgba(26, 31, 42, 0.98) 0%, rgba(20, 25, 32, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Save Custom View</h2>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* View name input */}
          <div>
            <label className="block text-sm text-white/60 mb-2">View Name</label>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., High-value EVs"
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-white/30
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5
                text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
            />
            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
              Set as default view (loads automatically)
            </span>
          </label>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* What will be saved */}
          <div
            className="p-3 rounded-lg text-xs text-white/40"
            style={{ background: "rgba(255, 255, 255, 0.03)" }}
          >
            <p className="font-medium text-white/50 mb-1">This view will save:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Column order and visibility</li>
              <li>Current filters and search</li>
              <li>Sort settings</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white/80
              hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !viewName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30
              disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save View
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
