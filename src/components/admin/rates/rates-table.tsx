"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { ratesColumns } from "./rates-columns";
import type { BrowseRate, Pagination, SortState } from "@/lib/rates/types";

interface RatesTableProps {
  rates: BrowseRate[];
  pagination: Pagination;
  isLoading?: boolean;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onPageChange: (page: number) => void;
}

export function RatesTable({
  rates,
  pagination,
  isLoading,
  sort,
  onSortChange,
  onPageChange,
}: RatesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: sort.field === "totalRentalGbp" ? "totalRentalGbp" : sort.field, desc: sort.order === "desc" },
  ]);

  const table = useReactTable({
    data: rates,
    columns: ratesColumns,
    state: { sorting },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0) {
        const sortField = newSorting[0].id as SortState["field"];
        const sortOrder = newSorting[0].desc ? "desc" : "asc";
        onSortChange({ field: sortField, order: sortOrder });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  // Calculate page range for pagination
  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          className="overflow-auto admin-scrollbar"
          style={{ maxHeight: "calc(100vh - 420px)" }}
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
                    return (
                      <th
                        key={header.id}
                        className={`
                          px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider
                          transition-colors duration-150
                          ${header.column.getCanSort()
                            ? "cursor-pointer select-none hover:bg-white/5"
                            : ""
                          }
                          ${isSorted ? "text-cyan-400" : "text-white/50"}
                        `}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                          minWidth: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined,
                        }}
                        aria-sort={isSorted ? (isSorted === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className={`transition-opacity ${isSorted ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
                              {isSorted === "asc" ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : isSorted === "desc" ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                              )}
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
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {ratesColumns.map((_, j) => (
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
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan={ratesColumns.length} className="px-3 py-16 text-center">
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
                        <p className="text-white/70 font-medium">No rates found</p>
                        <p className="text-white/40 text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`
                      group transition-colors duration-150 cursor-default
                      hover:bg-white/[0.03]
                      ${index % 2 === 0 ? "" : "bg-white/[0.01]"}
                    `}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isVariantCol = cell.column.id === "variant";
                      return (
                        <td
                          key={cell.id}
                          className={`px-3 py-2.5 ${isVariantCol ? "max-w-[200px]" : "whitespace-nowrap"}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg"
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
          {" rates"}
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
    </div>
  );
}
