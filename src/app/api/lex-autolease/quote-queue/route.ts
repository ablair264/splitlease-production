import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type QueueItem = {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  lexMakeCode: string;
  lexModelCode: string;
  lexVariantCode: string;
  term: number;
  mileage: number;
  contractType: string;
  status: "pending" | "running" | "complete" | "error";
  result?: {
    quoteId?: string;
    monthlyRental?: number;
    initialRental?: number;
    otrp?: number;
  };
  error?: string;
};

// In-memory queue (for simplicity - in production use Redis or database)
let quoteQueue: QueueItem[] = [];
let queueId: string | null = null;

/**
 * GET /api/lex-autolease/quote-queue
 * Get current quote queue status
 */
export async function GET() {
  return NextResponse.json({
    queueId,
    queue: quoteQueue,
    pendingCount: quoteQueue.filter((q) => q.status === "pending").length,
    completeCount: quoteQueue.filter((q) => q.status === "complete").length,
    errorCount: quoteQueue.filter((q) => q.status === "error").length,
  });
}

/**
 * POST /api/lex-autolease/quote-queue
 * Add vehicles to the quote queue
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicles } = body as { vehicles: Omit<QueueItem, "status">[] };

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: "No vehicles provided" },
        { status: 400 }
      );
    }

    // Create new queue
    queueId = `queue_${Date.now()}`;
    quoteQueue = vehicles.map((v) => ({
      ...v,
      status: "pending" as const,
    }));

    return NextResponse.json({
      success: true,
      queueId,
      count: quoteQueue.length,
    });
  } catch (error) {
    console.error("Error creating quote queue:", error);
    return NextResponse.json(
      { error: "Failed to create queue" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lex-autolease/quote-queue
 * Update a queue item's status (called by extension)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, status, result, error } = body as {
      vehicleId: string;
      status: "running" | "complete" | "error";
      result?: QueueItem["result"];
      error?: string;
    };

    const itemIndex = quoteQueue.findIndex((q) => q.vehicleId === vehicleId);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Vehicle not found in queue" },
        { status: 404 }
      );
    }

    quoteQueue[itemIndex] = {
      ...quoteQueue[itemIndex],
      status,
      result,
      error,
    };

    // If complete with result, save to database
    if (status === "complete" && result?.monthlyRental) {
      const item = quoteQueue[itemIndex];

      try {
        // Save to lex_quotes table
        await sql`
          INSERT INTO lex_quotes (
            vehicle_id,
            cap_code,
            manufacturer,
            model,
            variant,
            term,
            annual_mileage,
            contract_type,
            monthly_rental,
            initial_rental,
            otrp,
            quote_id,
            created_at
          ) VALUES (
            ${item.vehicleId},
            ${item.capCode},
            ${item.manufacturer},
            ${item.model},
            ${item.variant},
            ${item.term},
            ${item.mileage},
            ${item.contractType},
            ${result.monthlyRental},
            ${result.initialRental || null},
            ${result.otrp || null},
            ${result.quoteId || null},
            NOW()
          )
        `;
      } catch (dbError) {
        console.error("Failed to save quote to database:", dbError);
        // Don't fail the request - quote was still retrieved successfully
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating queue item:", error);
    return NextResponse.json(
      { error: "Failed to update queue" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lex-autolease/quote-queue
 * Clear the queue
 */
export async function DELETE() {
  quoteQueue = [];
  queueId = null;
  return NextResponse.json({ success: true });
}
