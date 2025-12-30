import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/admin/imports
 *
 * Returns paginated list of ratebook imports with filtering.
 *
 * Query params:
 * - source: provider code filter (optional)
 * - status: completed, processing, failed, pending (optional)
 * - days: number of days to look back (optional, default 90)
 * - page: page number (optional, default 1)
 * - pageSize: items per page (optional, default 50)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");
    const status = searchParams.get("status");
    const days = parseInt(searchParams.get("days") || "90");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = [];

    if (source && source !== "all") {
      conditions.push(`provider_code = '${source}'`);
    }

    if (status && status !== "all") {
      conditions.push(`status = '${status}'`);
    }

    if (days && days !== 0) {
      conditions.push(`created_at >= NOW() - INTERVAL '${days} days'`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Get total count
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as total
      FROM ratebook_imports
      ${whereClause}
    `));

    const total = Number((countResult.rows[0] as { total: string })?.total || 0);

    // Get imports
    const result = await db.execute(sql.raw(`
      SELECT
        id,
        provider_code,
        contract_type,
        file_name,
        status,
        total_rows,
        success_rows,
        error_rows,
        is_latest,
        completed_at,
        created_at
      FROM ratebook_imports
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `));

    const imports = (result.rows as Array<{
      id: string;
      provider_code: string;
      contract_type: string;
      file_name: string | null;
      status: string;
      total_rows: number;
      success_rows: number;
      error_rows: number;
      is_latest: boolean;
      completed_at: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      providerCode: row.provider_code,
      contractType: row.contract_type,
      fileName: row.file_name,
      status: row.status,
      totalRows: row.total_rows || 0,
      successRows: row.success_rows || 0,
      errorRows: row.error_rows || 0,
      isLatest: row.is_latest,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      imports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Imports fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch imports" },
      { status: 500 }
    );
  }
}
