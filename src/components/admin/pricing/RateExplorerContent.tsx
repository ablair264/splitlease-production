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

export default function RateExplorerContent() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const pageSize = 50;

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

  const { data, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ["rate-explorer-vehicles", page, sort, filters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rates/vehicles-table?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
    staleTime: 30000,
  });

  const toggleSpecialOfferMutation = useMutation({
    mutationFn: async ({ vehicleId, isSpecialOffer }: { vehicleId: string; isSpecialOffer: boolean }) => {
      const method = isSpecialOffer ? "POST" : "DELETE";
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/special-offer`, { method });
      if (!res.ok) throw new Error("Failed to update special offer status");
      return res.json();
    },
    onMutate: async ({ vehicleId, isSpecialOffer }) => {
      await queryClient.cancelQueries({ queryKey: ["rate-explorer-vehicles"] });
      const previousData = queryClient.getQueryData<VehiclesResponse>(["rate-explorer-vehicles", page, sort, filters]);
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
      if (context?.previousData) {
        queryClient.setQueryData(["rate-explorer-vehicles", page, sort, filters], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-explorer-vehicles"] });
    },
  });

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

  const handleFiltersChange = useCallback((newFilters: TableFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: SortState) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleToggleSpecialOffer = useCallback((vehicleId: string, isSpecialOffer: boolean) => {
    toggleSpecialOfferMutation.mutate({ vehicleId, isSpecialOffer });
  }, [toggleSpecialOfferMutation]);

  const handleToggleEnabled = useCallback((vehicleId: string, enabled: boolean) => {
    toggleEnabledMutation.mutate({ vehicleId, enabled });
  }, [toggleEnabledMutation]);

  const handleApplyView = useCallback((view: {
    columnOrder: string[];
    columnVisibility: Record<string, boolean>;
    filters: TableFilters;
    sort: SortState;
  }) => {
    setFilters(view.filters);
    setSort(view.sort);
    setPage(1);
  }, []);

  const handleExport = useCallback(async (format: "csv" | "xlsx") => {
    const params = new URLSearchParams(buildQueryParams());
    params.set("format", format);
    params.set("pageSize", "10000");

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
    }
  }, [buildQueryParams]);

  const showLoadingModal = isLoading && !data;

  return (
    <div className="h-full flex flex-col">
      <LoadingModal isLoading={showLoadingModal} />

      <div className="shrink-0 px-6 py-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold text-white">Rate Explorer</h2>
        <p className="text-sm text-gray-400 mt-1">
          Browse and manage vehicle rates across all providers
        </p>
      </div>

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
