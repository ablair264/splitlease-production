"use client";

import { cn } from "@/lib/utils";
import type { DealsHeatmapResponse, HeatmapConfig } from "./types";

const ROW_OPTIONS: Array<{ value: HeatmapConfig["rowMode"]; label: string }> = [
  { value: "vehicles", label: "Vehicles" },
  { value: "make-model", label: "Make/Model" },
];

const COLUMN_OPTIONS: Array<{ value: HeatmapConfig["columnMode"]; label: string }> = [
  { value: "providers", label: "Providers" },
  { value: "contract-types", label: "Contract Types" },
];

const METRIC_OPTIONS: Array<{ value: HeatmapConfig["metric"]; label: string }> = [
  { value: "best-price", label: "Best Price" },
  { value: "price-range", label: "Price Range" },
  { value: "rate-count", label: "Rate Count" },
];

function getHeatClass({
  metric,
  value,
  min,
  max,
}: {
  metric: HeatmapConfig["metric"];
  value: number | null;
  min: number | null;
  max: number | null;
}) {
  if (value === null || min === null || max === null || min === max) {
    return "bg-white/5 text-gray-400";
  }

  const normalized = metric === "rate-count"
    ? (value - min) / (max - min)
    : 1 - (value - min) / (max - min);

  if (normalized > 0.66) return "bg-emerald-500/20 text-emerald-200";
  if (normalized > 0.33) return "bg-amber-500/15 text-amber-100";
  return "bg-rose-500/15 text-rose-200";
}

export function DealHeatmapTable({
  config,
  onConfigChange,
  data,
  isLoading,
  isError,
}: {
  config: HeatmapConfig;
  onConfigChange: (next: HeatmapConfig) => void;
  data?: DealsHeatmapResponse;
  isLoading: boolean;
  isError: boolean;
}) {
  const cells = data?.cells ?? [];
  const cellMap = new Map(cells.map((cell) => [`${cell.rowId}:${cell.columnId}`, cell]));

  const rowStats = new Map<
    string,
    { min: number | null; max: number | null }
  >();

  if (data) {
    data.rows.forEach((row) => {
      const rowCells = data.columns
        .map((column) => cellMap.get(`${row.id}:${column.id}`))
        .filter(Boolean);

    if (!rowCells.length) {
      rowStats.set(row.id, { min: null, max: null });
      return;
    }

    const values = rowCells.map((cell) => {
      if (!cell) return null;
      if (config.metric === "rate-count") return cell.count ?? null;
      if (config.metric === "price-range") return cell.min ?? null;
      return cell.value ?? null;
    }).filter((value): value is number => value !== null);

    if (!values.length) {
      rowStats.set(row.id, { min: null, max: null });
      return;
    }

    rowStats.set(row.id, {
      min: Math.min(...values),
      max: Math.max(...values),
    });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-800 bg-[#121821] p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">Rows</span>
          <select
            value={config.rowMode}
            onChange={(event) =>
              onConfigChange({ ...config, rowMode: event.target.value as HeatmapConfig["rowMode"] })
            }
            className="bg-[#1a1f2a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#79d5e9]/50"
          >
            {ROW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">Columns</span>
          <select
            value={config.columnMode}
            onChange={(event) =>
              onConfigChange({
                ...config,
                columnMode: event.target.value as HeatmapConfig["columnMode"],
              })
            }
            className="bg-[#1a1f2a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#79d5e9]/50"
          >
            {COLUMN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">Metric</span>
          <select
            value={config.metric}
            onChange={(event) =>
              onConfigChange({
                ...config,
                metric: event.target.value as HeatmapConfig["metric"],
              })
            }
            className="bg-[#1a1f2a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#79d5e9]/50"
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-gray-800 bg-[#121821] p-6 text-gray-500">
          Loading heatmap...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          Failed to load heatmap data.
        </div>
      )}

      {data && !isLoading && data.rows.length === 0 && (
        <div className="rounded-2xl border border-gray-800 bg-[#121821] p-6 text-gray-500">
          No heatmap data for these filters.
        </div>
      )}

      {data && !isLoading && data.rows.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-[#121821] overflow-hidden">
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-[#0f1419] text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="sticky left-0 z-10 bg-[#0f1419] px-4 py-3 text-left border-b border-gray-800">
                    {config.rowMode === "vehicles" ? "Vehicle" : "Make/Model"}
                  </th>
                  {data.columns.map((column) => (
                    <th key={column.id} className="px-4 py-3 text-left border-b border-gray-800">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const rowStat = rowStats.get(row.id) ?? { min: null, max: null };
                  return (
                    <tr key={row.id} className="border-b border-gray-800">
                      <td className="sticky left-0 z-10 bg-[#121821] px-4 py-3 text-sm text-white">
                        <div className="font-semibold text-white">{row.label}</div>
                        {row.subLabel && <div className="text-xs text-gray-500">{row.subLabel}</div>}
                      </td>
                      {data.columns.map((column) => {
                        const cell = cellMap.get(`${row.id}:${column.id}`);
                        const value =
                          config.metric === "rate-count"
                            ? cell?.count ?? null
                            : config.metric === "price-range"
                            ? cell?.min ?? null
                            : cell?.value ?? null;
                        const className = getHeatClass({
                          metric: config.metric,
                          value,
                          min: rowStat.min,
                          max: rowStat.max,
                        });

                        return (
                          <td key={column.id} className={cn("px-4 py-3 border-b border-gray-900", className)}>
                            {config.metric === "price-range" ? (
                              cell?.min != null && cell?.max != null ? (
                                <span>
                                  &pound;{cell.min.toLocaleString()}-&pound;{cell.max.toLocaleString()}
                                </span>
                              ) : (
                                <span>-</span>
                              )
                            ) : config.metric === "rate-count" ? (
                              <span>{cell?.count ?? "-"}</span>
                            ) : (
                              <span>
                                {cell?.value !== null ? (
                                  <>
                                    &pound;{cell?.value?.toLocaleString()}
                                  </>
                                ) : (
                                  "-"
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
