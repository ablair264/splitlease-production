"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, Trash2, Loader2, LayoutGrid } from "lucide-react";
import type { VisibilityState, ColumnOrderState } from "@tanstack/react-table";
import type { UserView, TableFilters, SortState } from "./types";

interface ViewSelectorProps {
  onApplyView: (view: {
    columnOrder: ColumnOrderState;
    columnVisibility: VisibilityState;
    filters: TableFilters;
    sort: SortState;
  }) => void;
  refreshTrigger?: number; // Increment to trigger refresh
}

export function ViewSelector({ onApplyView, refreshTrigger }: ViewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [views, setViews] = useState<UserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch views
  const fetchViews = async () => {
    try {
      const response = await fetch("/api/admin/user-views?tableId=rate-explorer");
      if (response.ok) {
        const data = await response.json();
        setViews(data.views || []);

        // Select and APPLY default view if exists
        const defaultView = data.views?.find((v: UserView) => v.isDefault);
        if (defaultView && !selectedViewId) {
          setSelectedViewId(defaultView.id);
          // Auto-apply the default view
          const defaultFilters: TableFilters = {
            search: "",
            manufacturers: [],
            fuelTypes: [],
            priceMin: null,
            priceMax: null,
            scoreMin: 0,
            scoreMax: 100,
            ageMax: null,
            specialOfferOnly: false,
            enabledOnly: false,
            vehicleCategory: "all",
          };
          onApplyView({
            columnOrder: defaultView.columnOrder || [],
            columnVisibility: defaultView.columnVisibility || {},
            filters: defaultView.filters ? { ...defaultFilters, ...defaultView.filters } as TableFilters : defaultFilters,
            sort: {
              field: defaultView.sortBy || "bestScore",
              order: (defaultView.sortOrder as "asc" | "desc") || "desc",
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch views:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViews();
  }, [refreshTrigger]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply a view
  const handleSelectView = (view: UserView) => {
    setSelectedViewId(view.id);
    setIsOpen(false);

    const defaultFilters: TableFilters = {
      search: "",
      manufacturers: [],
      fuelTypes: [],
      priceMin: null,
      priceMax: null,
      scoreMin: 0,
      scoreMax: 100,
      ageMax: null,
      specialOfferOnly: false,
      enabledOnly: false,
      vehicleCategory: "all",
    };

    onApplyView({
      columnOrder: view.columnOrder || [],
      columnVisibility: view.columnVisibility || {},
      filters: view.filters ? { ...defaultFilters, ...view.filters } as TableFilters : defaultFilters,
      sort: {
        field: view.sortBy || "bestScore",
        order: (view.sortOrder as "asc" | "desc") || "desc",
      },
    });
  };

  // Delete a view
  const handleDeleteView = async (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();

    if (!confirm("Delete this view?")) return;

    setDeletingId(viewId);
    try {
      const response = await fetch(`/api/admin/user-views/${viewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setViews((prev) => prev.filter((v) => v.id !== viewId));
        if (selectedViewId === viewId) {
          setSelectedViewId(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete view:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Get selected view name
  const selectedView = views.find((v) => v.id === selectedViewId);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
          text-white/70 hover:text-white hover:bg-white/5
          transition-all duration-200"
        style={{
          background: isOpen ? "rgba(255, 255, 255, 0.05)" : "transparent",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="max-w-[120px] truncate">
          {selectedView ? selectedView.viewName : "Views"}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-64 rounded-xl py-2 z-50"
          style={{
            background: "rgba(26, 31, 42, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            </div>
          ) : views.length === 0 ? (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-white/40">No saved views</p>
              <p className="text-xs text-white/30 mt-1">
                Customize columns and save a view
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {views.map((view) => (
                <div
                  key={view.id}
                  onClick={() => handleSelectView(view)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 cursor-pointer
                    hover:bg-white/5 transition-colors group
                    ${selectedViewId === view.id ? "bg-cyan-500/10" : ""}
                  `}
                >
                  {/* Default indicator */}
                  <div className="w-4 flex-shrink-0">
                    {view.isDefault && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    )}
                  </div>

                  {/* View name */}
                  <span
                    className={`flex-1 text-sm truncate ${
                      selectedViewId === view.id ? "text-cyan-400" : "text-white/70"
                    }`}
                  >
                    {view.viewName}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteView(e, view.id)}
                    disabled={deletingId === view.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded
                      text-white/30 hover:text-red-400 transition-all"
                    title="Delete view"
                  >
                    {deletingId === view.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reset to default */}
          {views.length > 0 && (
            <>
              <div className="my-2 border-t border-white/10" />
              <button
                onClick={() => {
                  setSelectedViewId(null);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white/50
                  hover:text-white/70 hover:bg-white/5 transition-colors"
              >
                Reset to default columns
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
