import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const make = searchParams.get("make");
    const batchId = searchParams.get("batchId");
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (make) {
      whereClause += ` AND make = $${paramIndex}`;
      params.push(make);
      paramIndex++;
    }

    if (batchId) {
      whereClause += ` AND request_batch_id = $${paramIndex}`;
      params.push(batchId);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM lex_quotes ${whereClause}`;
    const countResult = await sql(countQuery, params);
    const total = parseInt(countResult[0].count as string);

    // Get quotes
    const quotesQuery = `
      SELECT * FROM lex_quotes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const quotes = await sql(quotesQuery, [...params, limit, offset]);

    // Get unique makes for filter
    const makesResult = await sql`
      SELECT DISTINCT make FROM lex_quotes ORDER BY make
    `;
    const makes = makesResult.map(r => r.make);

    return NextResponse.json({
      quotes,
      makes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quotes, batchId } = body;

    if (!quotes || !Array.isArray(quotes)) {
      return NextResponse.json(
        { error: "quotes array is required" },
        { status: 400 }
      );
    }

    let insertedCount = 0;

    for (const quote of quotes) {
      await sql`
        INSERT INTO lex_quotes (
          vehicle_id, cap_code, make_code, model_code, variant_code,
          make, model, variant, term, annual_mileage,
          initial_rental, monthly_rental, excess_mileage_charge,
          maintenance_included, quote_reference, raw_response,
          status, error_message, request_batch_id, quoted_at
        ) VALUES (
          ${quote.vehicleId || null},
          ${quote.capCode || null},
          ${quote.makeCode},
          ${quote.modelCode},
          ${quote.variantCode},
          ${quote.make},
          ${quote.model},
          ${quote.variant || null},
          ${quote.term},
          ${quote.annualMileage},
          ${quote.initialRental ? Math.round(quote.initialRental * 100) : null},
          ${quote.monthlyRental ? Math.round(quote.monthlyRental * 100) : null},
          ${quote.excessMileageCharge || null},
          ${quote.maintenanceIncluded || false},
          ${quote.quoteReference || null},
          ${quote.rawResponse ? JSON.stringify(quote.rawResponse) : null},
          ${quote.success ? 'success' : 'error'},
          ${quote.error || null},
          ${batchId || null},
          ${quote.success ? new Date() : null}
        )
      `;
      insertedCount++;
    }

    // Update batch status if batchId provided
    if (batchId) {
      const successCount = quotes.filter(q => q.success).length;
      const errorCount = quotes.filter(q => !q.success).length;

      await sql`
        UPDATE lex_quote_requests
        SET
          processed_count = processed_count + ${quotes.length},
          success_count = success_count + ${successCount},
          error_count = error_count + ${errorCount},
          updated_at = NOW()
        WHERE batch_id = ${batchId}
      `;
    }

    return NextResponse.json({
      success: true,
      insertedCount
    });
  } catch (error) {
    console.error("Error saving quotes:", error);
    return NextResponse.json(
      { error: "Failed to save quotes" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteId, batchId } = body;

    if (quoteId) {
      await sql`DELETE FROM lex_quotes WHERE id = ${quoteId}`;
    } else if (batchId) {
      await sql`DELETE FROM lex_quotes WHERE request_batch_id = ${batchId}`;
    } else {
      return NextResponse.json(
        { error: "quoteId or batchId required" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quotes:", error);
    return NextResponse.json(
      { error: "Failed to delete quotes" },
      { status: 500 }
    );
  }
}
