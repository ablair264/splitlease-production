"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RateExplorerTable } from "@/components/admin/rate-explorer";
import { LoadingModal } from "@/components/admin/rate-explorer/LoadingModal";
import type { TableFilters, SortState, VehicleTableRow, FilterOptions, Pagination } from "@/components/admin/rate-explorer/types";

const DEFAULT_FILTERS: TableFilters = {
  search: "",
  manufacturers: [],
  fuelTypes: [],
  priceMin: null,
  priceMax: null,
  scoreMin: 0,
  scoreMax: 100,
  ageMax: null,
  specialOfferOnly: false,
  enabledOnly: true,
  vehicleCategory: "cars",
};

const DEFAULT_SORT: SortState = {
  field: "bestScore",
  order: "desc",
};

interface VehiclesResponse {
  vehicles: VehicleTableRow[];
  pagination: Pagination;
  filterOptions: FilterOptions;
}

export default function RateExplorerPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Build query params
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy: sort.field,
      sortOrder: sort.order,
    });

    if (filters.search) params.set("search", filters.search);
    if (filters.manufacturers.length > 0) {
      params.set("manufacturers", filters.manufacturers.join(","));
    }
    if (filters.fuelTypes.length > 0) {
      params.set("fuelTypes", filters.fuelTypes.join(","));
    }
    if (filters.priceMin !== null) params.set("priceMin", filters.priceMin.toString());
    if (filters.priceMax !== null) params.set("priceMax", filters.priceMax.toString());
    if (filters.scoreMin > 0) params.set("scoreMin", filters.scoreMin.toString());
    if (filters.scoreMax < 100) params.set("scoreMax", filters.scoreMax.toString());
    if (filters.ageMax !== null) params.set("ageMax", filters.ageMax.toString());
    if (filters.specialOfferOnly) params.set("specialOffer", "true");
    params.set("enabledOnly", filters.enabledOnly.toString());
    if (filters.vehicleCategory !== "all") params.set("vehicleCategory", filters.vehicleCategory);

    return params.toString();
  }, [page, pageSize, sort, filters]);

  // Fetch vehicles
  const { data, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ["rate-explorer-vehicles", page, sort, filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rates/vehicles-table?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    staleTime: 30000,
  });

  // Toggle special offer mutation with optimistic updates
  const toggleSpecialOfferMutation = useMutation({
    mutationFn: async ({ vehicleId, isSpecialOffer }: { vehicleId: string; isSpecialOffer: boolean }) => {
      const method = isSpecialOffer ? "POST" : "DELETE";
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/special-offer`, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update special offer status");
      return res.json();
    },
    onMutate: async ({ vehicleId, isSpecialOffer }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["rate-explorer-vehicles"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<VehiclesResponse>(["rate-explorer-vehicles", page, sort, filters]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<VehiclesResponse>(["rate-explorer-vehicles", page, sort, filters], {
          ...previousData,
          vehicles: previousData.vehicles.map((v) =>
            v.id === vehicleId ? { ...v, isSpecialOffer } : v
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["rate-explorer-vehicles", page, sort, filters], context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after settle to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["rate-explorer-vehicles"] });
    },
  });

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ vehicleId, enabled }: { vehicleId: string; enabled: boolean }) => {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/toggle-enabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update enabled status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-explorer-vehicles"] });
    },
  });

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: TableFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((newSort: SortState) => {
    setSort(newSort);
    setPage(1); // Reset to first page on sort change
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Handle special offer toggle
  const handleToggleSpecialOffer = useCallback((vehicleId: string, isSpecialOffer: boolean) => {
    toggleSpecialOfferMutation.mutate({ vehicleId, isSpecialOffer });
  }, [toggleSpecialOfferMutation]);

  // Handle enabled toggle
  const handleToggleEnabled = useCallback((vehicleId: string, enabled: boolean) => {
    toggleEnabledMutation.mutate({ vehicleId, enabled });
  }, [toggleEnabledMutation]);

  // Handle applying a saved view
  const handleApplyView = useCallback((view: {
    columnOrder: string[];
    columnVisibility: Record<string, boolean>;
    filters: TableFilters;
    sort: SortState;
  }) => {
    // Update filters and sort from the saved view
    setFilters(view.filters);
    setSort(view.sort);
    setPage(1); // Reset to first page when applying a view
  }, []);

  // Handle export
  const handleExport = useCallback(async (format: "csv" | "xlsx") => {
    // Build export URL with current filters
    const params = new URLSearchParams(buildQueryParams());
    params.set("format", format);
    params.set("pageSize", "10000"); // Export all matching records

    try {
      const res = await fetch(`/api/admin/rates/vehicles-table/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rate-explorer-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      // TODO: Show error notification
    }
  }, [buildQueryParams]);

  // Show loading modal only on initial load (no data yet)
  const showLoadingModal = isLoading && !data;

  return (
    <div className="h-full flex flex-col bg-[#0f1419]">
      {/* Loading Modal */}
      <LoadingModal isLoading={showLoadingModal} />

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-gray-800">
        <h1 className="text-2xl font-semibold text-white">Rate Explorer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Browse and manage vehicle rates across all providers
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <RateExplorerTable
          vehicles={data?.vehicles || []}
          pagination={data?.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 0, hasMore: false }}
          filterOptions={data?.filterOptions || { manufacturers: [], fuelTypes: [], providers: [], priceRange: { min: 0, max: 10000 } }}
          isLoading={isLoading}
          filters={filters}
          sort={sort}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
          onToggleSpecialOffer={handleToggleSpecialOffer}
          onToggleEnabled={handleToggleEnabled}
          onExport={handleExport}
          onApplyView={handleApplyView}
        />
      </div>
    </div>
  );
}
