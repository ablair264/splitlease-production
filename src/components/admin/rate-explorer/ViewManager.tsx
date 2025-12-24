"use client";

import { useState, useMemo } from "react";
import { X, GripVertical, Eye, EyeOff, Save, Plus } from "lucide-react";
import type { VisibilityState, ColumnOrderState } from "@tanstack/react-table";

interface ViewManagerProps {
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onClose: () => void;
}

// All available columns with labels
const ALL_COLUMNS: { id: string; label: string }[] = [
  { id: "select", label: "Checkbox" },
  { id: "star", label: "Special Offer" },
  { id: "logo", label: "Logo" },
  { id: "vehicleId", label: "Vehicle ID" },
  { id: "manufacturer", label: "Make" },
  { id: "model", label: "Model" },
  { id: "variant", label: "Variant" },
  { id: "fuelType", label: "Fuel Type" },
  { id: "p11dGbp", label: "P11D" },
  { id: "score", label: "Score" },
  { id: "bestFunder", label: "Best Price" },
  { id: "strength", label: "Strength" },
  { id: "integrity", label: "Integrity" },
];

// Column labels for display
const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  ALL_COLUMNS.map((col) => [col.id, col.label])
);

export function ViewManager({
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  onClose,
}: ViewManagerProps) {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Get columns in current order and available columns not in order
  const { orderedColumns, availableColumns } = useMemo(() => {
    const allColumnIds = ALL_COLUMNS.map((c) => c.id);
    const inOrder = columnOrder.filter((id) => allColumnIds.includes(id));
    const notInOrder = allColumnIds.filter((id) => !columnOrder.includes(id));
    return {
      orderedColumns: inOrder,
      availableColumns: notInOrder,
    };
  }, [columnOrder]);

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const newVisibility = {
      ...columnVisibility,
      [columnId]: columnVisibility[columnId] === false ? true : false,
    };
    onColumnVisibilityChange(newVisibility);
  };

  // Add column to order (when clicking + on available column)
  const addColumn = (columnId: string) => {
    // Add to end of order and make visible
    onColumnOrderChange([...columnOrder, columnId]);
    onColumnVisibilityChange({
      ...columnVisibility,
      [columnId]: true,
    });
  };

  // Handle drag start
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const newOrder = [...columnOrder];
    const draggedIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColumnId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    onColumnOrderChange(newOrder);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  return (
    <div
      className="mb-4 p-4 rounded-lg"
      style={{
        background: "rgba(26, 31, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Customize View</h3>
        <button
          onClick={onClose}
          className="p-1 text-white/50 hover:text-white/70"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current columns (in order) */}
      <div className="space-y-1">
        <p className="text-xs text-white/40 mb-2">Drag to reorder, click eye to show/hide</p>
        {orderedColumns.map((columnId) => {
          const isVisible = columnVisibility[columnId] !== false;
          const label = COLUMN_LABELS[columnId] || columnId;

          return (
            <div
              key={columnId}
              draggable
              onDragStart={() => handleDragStart(columnId)}
              onDragOver={(e) => handleDragOver(e, columnId)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg cursor-move
                transition-all duration-200
                ${draggedColumn === columnId ? "opacity-50 bg-cyan-500/10" : "bg-white/5 hover:bg-white/10"}
              `}
            >
              <GripVertical className="w-4 h-4 text-white/30" />
              <span className={`flex-1 text-sm ${isVisible ? "text-white/80" : "text-white/40"}`}>
                {label}
              </span>
              <button
                onClick={() => toggleColumn(columnId)}
                className={`p-1 rounded transition-colors ${
                  isVisible ? "text-cyan-400 hover:text-cyan-300" : "text-white/30 hover:text-white/50"
                }`}
                title={isVisible ? "Hide column" : "Show column"}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Available columns (not in order) */}
      {availableColumns.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 mb-2">Available columns</p>
          <div className="space-y-1">
            {availableColumns.map((columnId) => {
              const label = COLUMN_LABELS[columnId] || columnId;

              return (
                <div
                  key={columnId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  <span className="flex-1 text-sm text-white/40">{label}</span>
                  <button
                    onClick={() => addColumn(columnId)}
                    className="p-1 rounded text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Add column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save view button placeholder */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
            bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30
            transition-all duration-200"
        >
          <Save className="w-4 h-4" />
          Save as Custom View
        </button>
      </div>
    </div>
  );
}
