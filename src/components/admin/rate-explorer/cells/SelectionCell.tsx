"use client";

import { type Row, type Table } from "@tanstack/react-table";
import type { VehicleTableRow } from "../types";

interface SelectionHeaderProps {
  table: Table<VehicleTableRow>;
}

export function SelectionHeader({ table }: SelectionHeaderProps) {
  const isAllSelected = table.getIsAllRowsSelected();
  const isSomeSelected = table.getIsSomeRowsSelected();

  return (
    <div className="flex items-center justify-center">
      <input
        type="checkbox"
        checked={isAllSelected}
        ref={(el) => {
          if (el) el.indeterminate = isSomeSelected && !isAllSelected;
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="w-4 h-4 rounded border-white/30 bg-transparent text-cyan-500
          focus:ring-cyan-500/30 focus:ring-offset-0 cursor-pointer
          checked:bg-cyan-500 checked:border-cyan-500"
        aria-label="Select all rows"
      />
    </div>
  );
}

interface SelectionCellProps {
  row: Row<VehicleTableRow>;
}

export function SelectionCell({ row }: SelectionCellProps) {
  return (
    <div className="flex items-center justify-center">
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="w-4 h-4 rounded border-white/30 bg-transparent text-cyan-500
          focus:ring-cyan-500/30 focus:ring-offset-0 cursor-pointer
          checked:bg-cyan-500 checked:border-cyan-500"
        aria-label={`Select ${row.original.manufacturer} ${row.original.model}`}
      />
    </div>
  );
}
