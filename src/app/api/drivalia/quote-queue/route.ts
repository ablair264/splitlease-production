import { NextRequest, NextResponse } from "next/server";

// In-memory queue for simplicity (will reset on server restart)
// In production, use a database table like lex_quote_queue
type QueueItem = {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  term: number;
  mileage: number;
  contractType: string;
  status: "pending" | "running" | "complete" | "error";
  result?: {
    quoteId?: string;
    monthlyRental?: number;
    monthlyRentalIncVat?: number;
    initialRental?: number;
    p11d?: number;
  };
  error?: string;
  createdAt: string;
};

// Global queue storage
declare global {
  // eslint-disable-next-line no-var
  var drivaliaQueue: QueueItem[] | undefined;
}

function getQueue(): QueueItem[] {
  if (!global.drivaliaQueue) {
    global.drivaliaQueue = [];
  }
  return global.drivaliaQueue;
}

/**
 * GET /api/drivalia/quote-queue
 * Get current quote queue status
 */
export async function GET() {
  const queue = getQueue();

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const completeCount = queue.filter((q) => q.status === "complete").length;
  const errorCount = queue.filter((q) => q.status === "error").length;

  return NextResponse.json({
    queue,
    pendingCount,
    completeCount,
    errorCount,
  });
}

/**
 * POST /api/drivalia/quote-queue
 * Add vehicles to the quote queue
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: {
        vehicleId: string;
        capCode: string;
        manufacturer: string;
        model: string;
        variant: string;
        term: number;
        mileage: number;
        contractType: string;
      }[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    // Clear pending/running items before adding new ones
    const queue = getQueue();
    global.drivaliaQueue = queue.filter(
      (q) => q.status !== "pending" && q.status !== "running"
    );

    // Add new items
    for (const item of items) {
      global.drivaliaQueue.push({
        ...item,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      count: items.length,
    });
  } catch (error) {
    console.error("Error creating Drivalia quote queue:", error);
    return NextResponse.json(
      { error: "Failed to create queue" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/drivalia/quote-queue
 * Update a queue item's status (called by extension)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, status, result, error } = body as {
      vehicleId: string;
      status: "running" | "complete" | "error";
      result?: {
        quoteId?: string;
        monthlyRental?: number;
        monthlyRentalIncVat?: number;
        initialRental?: number;
        p11d?: number;
      };
      error?: string;
    };

    const queue = getQueue();
    const index = queue.findIndex((q) => q.vehicleId === vehicleId);

    if (index === -1) {
      return NextResponse.json(
        { error: "Item not found in queue" },
        { status: 404 }
      );
    }

    queue[index].status = status;
    if (result) {
      queue[index].result = result;
    }
    if (error) {
      queue[index].error = error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Drivalia queue item:", error);
    return NextResponse.json(
      { error: "Failed to update queue" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drivalia/quote-queue
 * Clear the queue
 */
export async function DELETE() {
  global.drivaliaQueue = [];
  return NextResponse.json({ success: true });
}
