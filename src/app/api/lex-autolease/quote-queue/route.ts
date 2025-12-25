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
  co2?: number;
  paymentPlan?: string;
  customOtrp?: number; // For rerun with Fleet Marque pricing (in pence)
  status: "pending" | "running" | "complete" | "error" | "flagged";
  result?: {
    quoteId?: string;
    monthlyRental?: number;
    initialRental?: number;
    otrp?: number;
    brokerOtrp?: number; // Lex Broker OTRP in pence
  };
  fleetMarque?: {
    hasLowerPrice: boolean;
    discountedPrice: number; // in pence
    savings: number; // in pence (how much cheaper FM is)
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

    // If complete with result, check Fleet Marque pricing
    if (status === "complete" && result?.brokerOtrp) {
      const item = quoteQueue[itemIndex];

      try {
        // Check if Fleet Marque has a better price for this vehicle
        const fmResult = await sql`
          SELECT discounted_price, savings
          FROM fleet_marque_terms
          WHERE vehicle_id = ${item.vehicleId}
          LIMIT 1
        `;

        if (fmResult.length > 0) {
          const fmPrice = fmResult[0].discounted_price as number;
          const lexBrokerOtrp = result.brokerOtrp;

          if (fmPrice && fmPrice < lexBrokerOtrp) {
            // Fleet Marque has a lower price - flag this item
            quoteQueue[itemIndex].fleetMarque = {
              hasLowerPrice: true,
              discountedPrice: fmPrice,
              savings: lexBrokerOtrp - fmPrice,
            };
            quoteQueue[itemIndex].status = "flagged";
            console.log(
              `[FleetMarque] Vehicle ${item.manufacturer} ${item.model}: FM £${(fmPrice / 100).toFixed(2)} vs Lex £${(lexBrokerOtrp / 100).toFixed(2)} - saving £${((lexBrokerOtrp - fmPrice) / 100).toFixed(2)}`
            );
          }
        }
      } catch (fmError) {
        console.error("Failed to check Fleet Marque pricing:", fmError);
        // Continue without FM comparison
      }
    }

    // If complete with result, save to database
    if ((status === "complete" || quoteQueue[itemIndex].status === "flagged") && result?.monthlyRental) {
      const item = quoteQueue[itemIndex];

      try {
        // Save to lex_quotes table
        // Convert monthly rental to pence for storage
        const monthlyRentalPence = Math.round(result.monthlyRental * 100);
        const initialRentalPence = result.initialRental ? Math.round(result.initialRental * 100) : null;
        const otrpPence = result.otrp ? Math.round(result.otrp * 100) : null;

        await sql`
          INSERT INTO lex_quotes (
            vehicle_id,
            cap_code,
            make_code,
            model_code,
            variant_code,
            make,
            model,
            variant,
            term,
            annual_mileage,
            payment_plan,
            contract_type,
            monthly_rental,
            initial_rental,
            otrp,
            broker_otrp,
            quote_reference,
            status,
            created_at
          ) VALUES (
            ${item.vehicleId},
            ${item.capCode},
            ${item.lexMakeCode},
            ${item.lexModelCode},
            ${item.lexVariantCode},
            ${item.manufacturer},
            ${item.model},
            ${item.variant},
            ${item.term},
            ${item.mileage},
            ${item.paymentPlan || 'spread_3_down'},
            ${item.contractType},
            ${monthlyRentalPence},
            ${initialRentalPence},
            ${otrpPence},
            ${result.brokerOtrp || null},
            ${result.quoteId || null},
            'success',
            NOW()
          )
        `;
        console.log(`[DB] Saved quote ${result.quoteId} for ${item.manufacturer} ${item.model}`);
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
 * PUT /api/lex-autolease/quote-queue
 * Mark flagged items for rerun with Fleet Marque pricing
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleIds } = body as { vehicleIds: string[] };

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json(
        { error: "No vehicle IDs provided" },
        { status: 400 }
      );
    }

    let updated = 0;

    for (const vehicleId of vehicleIds) {
      const itemIndex = quoteQueue.findIndex((q) => q.vehicleId === vehicleId);
      if (itemIndex !== -1 && quoteQueue[itemIndex].fleetMarque?.hasLowerPrice) {
        // Set custom OTRP to Fleet Marque price and reset status to pending
        quoteQueue[itemIndex].customOtrp = quoteQueue[itemIndex].fleetMarque!.discountedPrice;
        quoteQueue[itemIndex].status = "pending";
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `${updated} item(s) queued for rerun with Fleet Marque pricing`,
    });
  } catch (error) {
    console.error("Error marking items for rerun:", error);
    return NextResponse.json(
      { error: "Failed to mark items for rerun" },
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
