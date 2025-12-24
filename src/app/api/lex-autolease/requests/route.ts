import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const requests = await sql`
      SELECT
        lqr.*,
        COALESCE(
          (SELECT COUNT(*) FROM lex_quotes lq WHERE lq.request_batch_id = lqr.batch_id),
          0
        ) as actual_quote_count
      FROM lex_quote_requests lqr
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      totalVehicles,
      term,
      annualMileage,
      initialRentalMonths = 1,
      maintenanceIncluded = false
    } = body;

    if (!totalVehicles || !term || !annualMileage) {
      return NextResponse.json(
        { error: "totalVehicles, term, and annualMileage are required" },
        { status: 400 }
      );
    }

    const batchId = `lex-${Date.now()}-${uuidv4().slice(0, 8)}`;

    await sql`
      INSERT INTO lex_quote_requests (
        batch_id, status, total_vehicles, term, annual_mileage,
        initial_rental_months, maintenance_included, started_at
      ) VALUES (
        ${batchId},
        'running',
        ${totalVehicles},
        ${term},
        ${annualMileage},
        ${initialRentalMonths},
        ${maintenanceIncluded},
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      batchId
    });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, status, errorLog } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 }
      );
    }

    if (status === "completed" || status === "failed") {
      await sql`
        UPDATE lex_quote_requests
        SET
          status = ${status},
          completed_at = NOW(),
          error_log = ${errorLog ? JSON.stringify(errorLog) : null}
        WHERE batch_id = ${batchId}
      `;
    } else if (status) {
      await sql`
        UPDATE lex_quote_requests
        SET status = ${status}
        WHERE batch_id = ${batchId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: "batchId is required" },
        { status: 400 }
      );
    }

    // Delete associated quotes first
    await sql`DELETE FROM lex_quotes WHERE request_batch_id = ${batchId}`;

    // Delete the request
    await sql`DELETE FROM lex_quote_requests WHERE batch_id = ${batchId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
