import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getContractTypesForFilters } from "@/lib/rates/types";
import type { ContractTab } from "@/lib/rates/types";

const PROVIDER_LABELS: Record<string, string> = {
  lex: "Lex",
  ogilvie: "Ogilvie",
  venus: "Venus",
  drivalia: "Drivalia",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const tab = (searchParams.get("tab") || "contract-hire") as ContractTab;
    const withMaintenance = searchParams.get("withMaintenance") !== "false";
    const contractTypes = getContractTypesForFilters(tab, withMaintenance);

    const rowMode = searchParams.get("rowMode") === "make-model" ? "make-model" : "vehicles";
    const columnMode = searchParams.get("columnMode") === "contract-types" ? "contract-types" : "providers";
    const metric = searchParams.get("metric") === "rate-count"
      ? "rate-count"
      : searchParams.get("metric") === "price-range"
      ? "price-range"
      : "best-price";

    const search = searchParams.get("search") || "";
    const manufacturers = searchParams.get("manufacturers")?.split(",").filter(Boolean) || [];
    const providers = searchParams.get("providers")?.split(",").filter(Boolean) || [];
    const fuelTypes = searchParams.get("fuelTypes")?.split(",").filter(Boolean) || [];
    const bodyStyles = searchParams.get("bodyStyles")?.split(",").filter(Boolean) || [];
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const scoreMin = parseInt(searchParams.get("scoreMin") || "0", 10);
    const rowLimit = Math.min(200, Math.max(20, parseInt(searchParams.get("limit") || "80", 10)));

    const filters = [sql`pr.vehicle_id IS NOT NULL`];

    if (contractTypes.length > 0) {
      filters.push(sql`pr.contract_type IN (${sql.join(contractTypes.map((ct) => sql`${ct}`), sql`, `)})`);
    }

    if (search) {
      filters.push(
        sql`(
          pr.manufacturer ILIKE ${"%" + search + "%"} OR
          pr.model ILIKE ${"%" + search + "%"} OR
          pr.variant ILIKE ${"%" + search + "%"} OR
          pr.cap_code ILIKE ${"%" + search + "%"}
        )`
      );
    }

    if (manufacturers.length > 0) {
      filters.push(
        sql`pr.manufacturer IN (${sql.join(manufacturers.map((m) => sql`${m.toUpperCase()}`), sql`, `)})`
      );
    }

    if (providers.length > 0) {
      filters.push(sql`pr.provider_code IN (${sql.join(providers.map((p) => sql`${p}`), sql`, `)})`);
    }

    if (fuelTypes.length > 0) {
      filters.push(sql`pr.fuel_type IN (${sql.join(fuelTypes.map((f) => sql`${f}`), sql`, `)})`);
    }

    if (bodyStyles.length > 0) {
      filters.push(sql`pr.body_style IN (${sql.join(bodyStyles.map((b) => sql`${b}`), sql`, `)})`);
    }

    if (minPrice) {
      filters.push(sql`pr.total_rental >= ${Math.round(parseFloat(minPrice) * 100)}`);
    }

    if (maxPrice) {
      filters.push(sql`pr.total_rental <= ${Math.round(parseFloat(maxPrice) * 100)}`);
    }

    // Use stored score from database (calculated at import time using unified scoring algorithm)
    const baseWhereClause = sql`${sql.join(filters, sql` AND `)}`;
    const whereClause = !Number.isNaN(scoreMin) && scoreMin > 0
      ? sql`${baseWhereClause} AND COALESCE(pr.score, 50) >= ${scoreMin}`
      : baseWhereClause;

    const rowsResult = rowMode === "vehicles"
      ? await db.execute(sql`
          WITH filtered AS (
            SELECT pr.vehicle_id, pr.manufacturer, pr.model, pr.variant
            FROM provider_rates pr
            JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
            LEFT JOIN vehicles v ON v.id = pr.vehicle_id
            WHERE ${whereClause}
          )
          SELECT DISTINCT ON (vehicle_id)
            vehicle_id AS id,
            manufacturer,
            model,
            variant
          FROM filtered
          ORDER BY vehicle_id, manufacturer, model, variant
          LIMIT ${rowLimit}
        `)
      : await db.execute(sql`
          WITH filtered AS (
            SELECT pr.manufacturer, pr.model
            FROM provider_rates pr
            JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
            LEFT JOIN vehicles v ON v.id = pr.vehicle_id
            WHERE ${whereClause}
          )
          SELECT DISTINCT manufacturer, model
          FROM filtered
          ORDER BY manufacturer, model
          LIMIT ${rowLimit}
        `);

    const rows = rowMode === "vehicles"
      ? (rowsResult.rows as Array<{ id: string; manufacturer: string; model: string; variant: string | null }>).map(
          (row) => ({
            id: row.id,
            label: `${row.manufacturer} ${row.model}`,
            subLabel: row.variant,
          })
        )
      : (rowsResult.rows as Array<{ manufacturer: string; model: string }>).map((row) => ({
          id: `${row.manufacturer}::${row.model}`,
          label: row.manufacturer,
          subLabel: row.model,
        }));

    const rowIds = rows.map((row) => row.id);

    if (rowIds.length === 0) {
      return NextResponse.json({ rows: [], columns: [], cells: [], metric });
    }

    const columnsResult = columnMode === "providers"
      ? await db.execute(sql`
          WITH filtered AS (
            SELECT pr.provider_code
            FROM provider_rates pr
            JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
            LEFT JOIN vehicles v ON v.id = pr.vehicle_id
            WHERE ${whereClause}
          )
          SELECT DISTINCT provider_code AS id
          FROM filtered
          ORDER BY provider_code
        `)
      : await db.execute(sql`
          WITH filtered AS (
            SELECT pr.contract_type
            FROM provider_rates pr
            JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
            LEFT JOIN vehicles v ON v.id = pr.vehicle_id
            WHERE ${whereClause}
          )
          SELECT DISTINCT contract_type AS id
          FROM filtered
          ORDER BY contract_type
        `);

    const columns = (columnsResult.rows as Array<{ id: string }>).map((row) => ({
      id: row.id,
      label: columnMode === "providers"
        ? PROVIDER_LABELS[row.id] || row.id.toUpperCase()
        : row.id,
    }));

    const rowIdSelector =
      rowMode === "vehicles"
        ? sql`f.vehicle_id`
        : sql`f.manufacturer || '::' || f.model`;
    const columnSelector =
      columnMode === "providers" ? sql`f.provider_code` : sql`f.contract_type`;

    const cellsResult = await db.execute(sql`
      WITH filtered AS (
        SELECT
          pr.vehicle_id,
          pr.manufacturer,
          pr.model,
          pr.provider_code,
          pr.contract_type,
          pr.total_rental
        FROM provider_rates pr
        JOIN ratebook_imports ri ON ri.id = pr.import_id AND ri.is_latest = true
        LEFT JOIN vehicles v ON v.id = pr.vehicle_id
        WHERE ${whereClause}
      )
      SELECT
        ${rowIdSelector} AS row_id,
        ${columnSelector} AS column_id,
        MIN(f.total_rental) AS min_rental,
        MAX(f.total_rental) AS max_rental,
        COUNT(*) AS rate_count
      FROM filtered f
      WHERE ${rowIdSelector} IN (${sql.join(rowIds.map((id) => sql`${id}`), sql`, `)})
      GROUP BY ${rowIdSelector}, ${columnSelector}
    `);

    const cells = (cellsResult.rows as Array<{
      row_id: string;
      column_id: string;
      min_rental: number;
      max_rental: number;
      rate_count: number;
    }>).map((row) => ({
      rowId: row.row_id,
      columnId: row.column_id,
      value: row.min_rental ? Math.round(row.min_rental / 100) : null,
      min: row.min_rental ? Math.round(row.min_rental / 100) : null,
      max: row.max_rental ? Math.round(row.max_rental / 100) : null,
      count: row.rate_count ? Number(row.rate_count) : null,
    }));

    return NextResponse.json({ rows, columns, cells, metric });
  } catch (error) {
    console.error("Error fetching deal heatmap:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deal heatmap" },
      { status: 500 }
    );
  }
}
