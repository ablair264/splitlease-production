export interface IdentifiedItem {
  id: string;
}

const chunk = <T>(items: T[], size: number) => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
};

/**
 * Build rows that keep an expanded item anchored to its original row position while
 * moving its row siblings beneath it. This mirrors the grid rendering so that
 * expansion does not force the item onto a new row.
 */
export function buildVehicleRows<T extends IdentifiedItem>(
  items: T[],
  columns: number,
  expandedId: string | null
): T[][] {
  const safeColumns = Math.max(1, columns);
  const baseRows = chunk(items, safeColumns);

  if (!expandedId) return baseRows;

  const rowIndex = baseRows.findIndex((row) => row.some((item) => item.id === expandedId));
  if (rowIndex === -1) return baseRows;

  const row = baseRows[rowIndex];
  const expandedIndex = row.findIndex((item) => item.id === expandedId);
  if (expandedIndex === -1) return baseRows;

  const expandedItem = row[expandedIndex];
  const overflow = [...row.slice(0, expandedIndex), ...row.slice(expandedIndex + 1)];

  const rearrangedRows: T[][] = [];
  // rows before the expanded item remain unchanged
  for (let i = 0; i < rowIndex; i++) {
    rearrangedRows.push(baseRows[i]);
  }

  // expanded item takes the lead column in its row
  rearrangedRows.push([expandedItem]);

  // siblings move directly beneath, keeping their relative order
  if (overflow.length) {
    rearrangedRows.push(...chunk(overflow, safeColumns));
  }

  // rows after the expanded item's original row stay in place
  for (let i = rowIndex + 1; i < baseRows.length; i++) {
    rearrangedRows.push(baseRows[i]);
  }

  return rearrangedRows;
}
