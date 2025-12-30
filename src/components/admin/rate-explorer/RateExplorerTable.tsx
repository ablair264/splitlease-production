"use client";

import { useState, useCallback, useMemo, useEffect, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type SortingState,
  type RowSelectionState,
  type ExpandedState,
  type ColumnOrderState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createRateExplorerColumns, defaultColumnOrder, defaultColumnVisibility } from "./RateExplorerColumns";
import { RateExplorerToolbar } from "./RateExplorerToolbar";
import { RateMatrixExpansion } from "./RateMatrixExpansion";
import { RowContextMenu } from "./RowContextMenu";
import type { VehicleTableRow, TableFilters, FilterOptions, Pagination, SortState } from "./types";

interface RateExplorerTableProps {
  vehicles: VehicleTableRow[];
  pagination: Pagination;
  filterOptions: FilterOptions;
  isLoading?: boolean;
  filters: TableFilters;
  sort: SortState;
  onFiltersChange: (filters: TableFilters) => void;
  onSortChange: (sort: SortState) => void;
  onPageChange: (page: number) => void;
  onToggleSpecialOffer: (vehicleId: string, isSpecialOffer: boolean) => void;
  onToggleEnabled: (vehicleId: string, enabled: boolean) => void;
  onExport: (format: "csv" | "xlsx") => void;
}

export function RateExplorerTable({
  vehicles,
  pagination,
  filterOptions,
  isLoading,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onPageChange,
  onToggleSpecialOffer,
  onToggleEnabled,
  onExport,
}: RateExplorerTableProps) {
  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: sort.field, desc: sort.order === "desc" },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(defaultColumnOrder);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  const [showMaintenance, setShowMaintenance] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: VehicleTableRow;
  } | null>(null);

  // Image download state
  const [downloadingVehicles, setDownloadingVehicles] = useState<Set<string>>(new Set());

  // Create columns with callbacks
  const columns = useMemo(
    () =>
      createRateExplorerColumns({
        onToggleSpecialOffer,
      }),
    [onToggleSpecialOffer]
  );

  // Create table instance
  const table = useReactTable({
    data: vehicles,
    columns,
    state: {
      sorting,
      rowSelection,
      expanded,
      columnOrder,
      columnVisibility,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0) {
        onSortChange({
          field: newSorting[0].id,
          order: newSorting[0].desc ? "desc" : "asc",
        });
      }
    },
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    manualSorting: true,
    enableRowSelection: true,
    enableMultiRowSelection: true,
  });

  // Handle row click for expansion
  const handleRowClick = useCallback((rowId: string) => {
    setExpanded((prev) => {
      const prevRecord = prev as Record<string, boolean>;
      return {
        ...prevRecord,
        [rowId]: !prevRecord[rowId],
      };
    });
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, row: VehicleTableRow) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      row,
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle image download
  const handleDownloadImages = useCallback(async (vehicleId: string) => {
    // Add to downloading set
    setDownloadingVehicles((prev) => new Set(prev).add(vehicleId));

    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/download-images`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        // Show success notification (could add toast here)
        console.log(
          `[Download Images] Success for ${result.vehicle.manufacturer} ${result.vehicle.model}: ${result.summary.uploaded}/${result.summary.total} images`
        );
        alert(
          `Downloaded ${result.summary.uploaded}/${result.summary.total} images for ${result.vehicle.manufacturer} ${result.vehicle.model}`
        );
      } else {
        console.error("[Download Images] Failed:", result.error);
        alert(`Failed to download images: ${result.error}`);
      }
    } catch (error) {
      console.error("[Download Images] Error:", error);
      alert(`Error downloading images: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      // Remove from downloading set
      setDownloadingVehicles((prev) => {
        const next = new Set(prev);
        next.delete(vehicleId);
        return next;
      });
      closeContextMenu();
    }
  }, [closeContextMenu]);

  // Close context menu on escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const handleClick = () => closeContextMenu();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [closeContextMenu]);

  // Get selected count
  const selectedCount = Object.keys(rowSelection).length;

  // Calculate page numbers
  const getPageNumbers = () => {
    const { totalPages, page } = pagination;
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);
    if (page > 3) pages.push("...");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <RateExplorerToolbar
        filters={filters}
        filterOptions={filterOptions}
        onFiltersChange={onFiltersChange}
        selectedCount={selectedCount}
        totalCount={pagination.total}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        onExport={onExport}
        showMaintenance={showMaintenance}
        onShowMaintenanceChange={setShowMaintenance}
      />

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full rounded-xl overflow-hidden"
          style={{
            background: "rgba(26, 31, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            className="h-full overflow-auto admin-scrollbar"
          >
            <table className="w-full" role="grid">
              <thead className="sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    style={{
                      background: "linear-gradient(180deg, rgba(15, 20, 25, 0.98) 0%, rgba(20, 25, 32, 0.98) 100%)",
                    }}
                  >
                    {headerGroup.headers.map((header) => {
                      const isSorted = header.column.getIsSorted();
                      const canSort = header.column.getCanSort();
                      return (
                        <th
                          key={header.id}
                          className={`
                            px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider
                            transition-colors duration-150
                            ${canSort ? "cursor-pointer select-none hover:bg-white/5" : ""}
                            ${isSorted ? "text-cyan-400" : "text-white/50"}
                          `}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          style={{
                            width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                            minWidth: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                          }}
                          aria-sort={isSorted ? (isSorted === "asc" ? "ascending" : "descending") : undefined}
                        >
                          <div className="flex items-center gap-1.5">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className={`transition-opacity ${isSorted ? "opacity-100" : "opacity-0"}`}>
                                {isSorted === "asc" ? (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                ) : isSorted === "desc" ? (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : null}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {columns.map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <div
                            className="h-4 rounded"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              width: `${60 + Math.random() * 40}%`,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(121, 213, 233, 0.1)" }}
                        >
                          <svg className="w-8 h-8 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white/70 font-medium">No vehicles found</p>
                          <p className="text-white/40 text-sm mt-1">Try adjusting your filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => {
                    const isExpanded = row.getIsExpanded();
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={`
                            group transition-colors duration-150 cursor-pointer
                            hover:bg-white/[0.03]
                            ${index % 2 === 0 ? "" : "bg-white/[0.01]"}
                            ${isExpanded ? "bg-cyan-500/5" : ""}
                            ${!row.original.isEnabled ? "opacity-50" : ""}
                          `}
                          style={{
                            borderBottom: isExpanded ? "none" : "1px solid rgba(255, 255, 255, 0.03)",
                          }}
                          onClick={() => handleRowClick(row.id)}
                          onContextMenu={(e) => handleContextMenu(e, row.original)}
                        >
                          {row.getVisibleCells().map((cell, cellIndex) => {
                            const isVariantCol = cell.column.id === "variant";
                            return (
                              <td
                                key={cell.id}
                                className={`px-3 py-2.5 ${isVariantCol ? "max-w-[200px]" : "whitespace-nowrap"}`}
                                onClick={(e) => {
                                  // Prevent row click for checkbox and star columns
                                  if (cell.column.id === "select" || cell.column.id === "star") {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {/* Show expand indicator on first data column (after checkbox/star) */}
                                  {cellIndex === 2 && (
                                    <span className="text-white/40 flex-shrink-0">
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </span>
                                  )}
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        {/* Expanded row content */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={row.getVisibleCells().length}
                              className="p-0"
                              style={{
                                background: "rgba(26, 31, 42, 0.5)",
                                borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                              }}
                            >
                              <RateMatrixExpansion vehicleId={row.original.id} showMaintenance={showMaintenance} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-4 py-3 mt-4 rounded-lg flex-shrink-0"
        style={{
          background: "rgba(26, 31, 42, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div className="text-sm text-white/50">
          <span className="text-white/70 font-medium">
            {((pagination.page - 1) * pagination.pageSize) + 1}
          </span>
          {" - "}
          <span className="text-white/70 font-medium">
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}
          </span>
          {" of "}
          <span className="text-white/70 font-medium">
            {pagination.total.toLocaleString()}
          </span>
          {" vehicles"}
        </div>

        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={`
              p-2 rounded-lg transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
              ${pagination.page === 1
                ? "opacity-30 cursor-not-allowed"
                : "text-white/60 hover:text-white hover:bg-white/5"
              }
            `}
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, i) =>
              page === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-white/30">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page as number)}
                  className={`
                    min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                    ${pagination.page === page
                      ? "text-white shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                    }
                  `}
                  style={pagination.page === page ? {
                    background: "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)",
                  } : {}}
                  aria-current={pagination.page === page ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasMore}
            className={`
              p-2 rounded-lg transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
              ${!pagination.hasMore
                ? "opacity-30 cursor-not-allowed"
                : "text-white/60 hover:text-white hover:bg-white/5"
              }
            `}
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <RowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          vehicle={contextMenu.row}
          onClose={closeContextMenu}
          onFilterByManufacturer={(manufacturer) => {
            onFiltersChange({ ...filters, manufacturers: [manufacturer] });
            closeContextMenu();
          }}
          onFilterByModel={(model) => {
            onFiltersChange({ ...filters, search: model });
            closeContextMenu();
          }}
          onToggleSpecialOffer={() => {
            onToggleSpecialOffer(contextMenu.row.id, !contextMenu.row.isSpecialOffer);
            closeContextMenu();
          }}
          onToggleEnabled={() => {
            onToggleEnabled(contextMenu.row.id, !contextMenu.row.isEnabled);
            closeContextMenu();
          }}
          onDownloadImages={() => handleDownloadImages(contextMenu.row.id)}
          isDownloading={downloadingVehicles.has(contextMenu.row.id)}
        />
      )}
    </div>
  );
}
