import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type QueueItemInput = {
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
  customOtrp?: number;
};

type QueueItemResult = {
  quoteId?: string;
  monthlyRental?: number;
  initialRental?: number;
  otrp?: number;
  brokerOtrp?: number;
};

/**
 * GET /api/lex-autolease/quote-queue
 * Get current quote queue status from database
 */
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        id,
        vehicle_id as "vehicleId",
        cap_code as "capCode",
        manufacturer,
        model,
        variant,
        lex_make_code as "lexMakeCode",
        lex_model_code as "lexModelCode",
        lex_variant_code as "lexVariantCode",
        term,
        mileage,
        contract_type as "contractType",
        payment_plan as "paymentPlan",
        co2,
        custom_otrp as "customOtrp",
        status,
        monthly_rental as "monthlyRental",
        initial_rental as "initialRental",
        otrp,
        broker_otrp as "brokerOtrp",
        quote_reference as "quoteReference",
        fleet_marque_price as "fleetMarquePrice",
        fleet_marque_savings as "fleetMarqueSavings",
        error,
        created_at as "createdAt"
      FROM lex_quote_queue
      ORDER BY created_at DESC
    `;

    // Transform to match the expected format
    const queue = rows.map((row) => ({
      vehicleId: row.vehicleId,
      capCode: row.capCode,
      manufacturer: row.manufacturer,
      model: row.model,
      variant: row.variant,
      lexMakeCode: row.lexMakeCode,
      lexModelCode: row.lexModelCode,
      lexVariantCode: row.lexVariantCode,
      term: row.term,
      mileage: row.mileage,
      contractType: row.contractType,
      paymentPlan: row.paymentPlan,
      co2: row.co2,
      customOtrp: row.customOtrp,
      status: row.status,
      result: row.monthlyRental
        ? {
            quoteId: row.quoteReference,
            monthlyRental: row.monthlyRental / 100, // Convert from pence to pounds
            initialRental: row.initialRental ? row.initialRental / 100 : undefined,
            otrp: row.otrp ? row.otrp / 100 : undefined,
            brokerOtrp: row.brokerOtrp,
          }
        : undefined,
      fleetMarque: row.fleetMarquePrice
        ? {
            hasLowerPrice: true,
            discountedPrice: row.fleetMarquePrice,
            savings: row.fleetMarqueSavings,
          }
        : undefined,
      error: row.error,
    }));

    const pendingCount = queue.filter((q) => q.status === "pending").length;
    const completeCount = queue.filter((q) => q.status === "complete").length;
    const errorCount = queue.filter((q) => q.status === "error").length;

    return NextResponse.json({
      queue,
      pendingCount,
      completeCount,
      errorCount,
    });
  } catch (error) {
    console.error("Error fetching quote queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue", queue: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lex-autolease/quote-queue
 * Add vehicles to the quote queue
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicles } = body as { vehicles: QueueItemInput[] };

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: "No vehicles provided" },
        { status: 400 }
      );
    }

    // Clear existing pending items before adding new ones
    await sql`DELETE FROM lex_quote_queue WHERE status IN ('pending', 'running')`;

    // Insert all vehicles into the queue
    for (const v of vehicles) {
      await sql`
        INSERT INTO lex_quote_queue (
          vehicle_id,
          cap_code,
          manufacturer,
          model,
          variant,
          lex_make_code,
          lex_model_code,
          lex_variant_code,
          term,
          mileage,
          contract_type,
          payment_plan,
          co2,
          custom_otrp,
          status
        ) VALUES (
          ${v.vehicleId},
          ${v.capCode},
          ${v.manufacturer},
          ${v.model},
          ${v.variant},
          ${v.lexMakeCode},
          ${v.lexModelCode},
          ${v.lexVariantCode},
          ${v.term},
          ${v.mileage},
          ${v.contractType},
          ${v.paymentPlan || "spread_3_down"},
          ${v.co2 || null},
          ${v.customOtrp || null},
          'pending'
        )
      `;
    }

    return NextResponse.json({
      success: true,
      count: vehicles.length,
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
      result?: QueueItemResult;
      error?: string;
    };

    // First update the basic status
    if (status === "running") {
      await sql`
        UPDATE lex_quote_queue
        SET status = 'running', updated_at = NOW()
        WHERE vehicle_id = ${vehicleId} AND status = 'pending'
      `;
      return NextResponse.json({ success: true });
    }

    if (status === "error") {
      await sql`
        UPDATE lex_quote_queue
        SET status = 'error', error = ${error || null}, updated_at = NOW()
        WHERE vehicle_id = ${vehicleId}
      `;
      return NextResponse.json({ success: true });
    }

    // For complete status, update with results
    if (status === "complete" && result) {
      const monthlyRentalPence = result.monthlyRental
        ? Math.round(result.monthlyRental * 100)
        : null;
      const initialRentalPence = result.initialRental
        ? Math.round(result.initialRental * 100)
        : null;
      const otrpPence = result.otrp ? Math.round(result.otrp * 100) : null;

      await sql`
        UPDATE lex_quote_queue
        SET
          status = 'complete',
          monthly_rental = ${monthlyRentalPence},
          initial_rental = ${initialRentalPence},
          otrp = ${otrpPence},
          broker_otrp = ${result.brokerOtrp || null},
          quote_reference = ${result.quoteId || null},
          updated_at = NOW()
        WHERE vehicle_id = ${vehicleId}
      `;

      // Check Fleet Marque pricing
      if (result.brokerOtrp) {
        try {
          const fmResult = await sql`
            SELECT discounted_price, savings
            FROM fleet_marque_terms
            WHERE vehicle_id = ${vehicleId}
            LIMIT 1
          `;

          if (fmResult.length > 0) {
            const fmPrice = fmResult[0].discounted_price as number;
            const lexBrokerOtrp = result.brokerOtrp;

            if (fmPrice && fmPrice < lexBrokerOtrp) {
              // Fleet Marque has a lower price - flag this item
              const savings = lexBrokerOtrp - fmPrice;
              await sql`
                UPDATE lex_quote_queue
                SET
                  status = 'flagged',
                  fleet_marque_price = ${fmPrice},
                  fleet_marque_savings = ${savings}
                WHERE vehicle_id = ${vehicleId}
              `;
              console.log(
                `[FleetMarque] Vehicle ${vehicleId}: FM £${(fmPrice / 100).toFixed(2)} vs Lex £${(lexBrokerOtrp / 100).toFixed(2)} - saving £${(savings / 100).toFixed(2)}`
              );
            }
          }
        } catch (fmError) {
          console.error("Failed to check Fleet Marque pricing:", fmError);
        }
      }

      // Also save to lex_quotes for historical record
      try {
        const queueItem = await sql`
          SELECT * FROM lex_quote_queue WHERE vehicle_id = ${vehicleId} LIMIT 1
        `;

        if (queueItem.length > 0) {
          const item = queueItem[0];
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
              ${item.vehicle_id},
              ${item.cap_code},
              ${item.lex_make_code},
              ${item.lex_model_code},
              ${item.lex_variant_code},
              ${item.manufacturer},
              ${item.model},
              ${item.variant},
              ${item.term},
              ${item.mileage},
              ${item.payment_plan || "spread_3_down"},
              ${item.contract_type},
              ${monthlyRentalPence},
              ${initialRentalPence},
              ${otrpPence},
              ${result.brokerOtrp || null},
              ${result.quoteId || null},
              'success',
              NOW()
            )
          `;
          console.log(
            `[DB] Saved quote ${result.quoteId} for ${item.manufacturer} ${item.model}`
          );
        }
      } catch (dbError) {
        console.error("Failed to save quote to lex_quotes:", dbError);
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
      const result = await sql`
        UPDATE lex_quote_queue
        SET
          custom_otrp = fleet_marque_price,
          status = 'pending',
          monthly_rental = NULL,
          initial_rental = NULL,
          otrp = NULL,
          broker_otrp = NULL,
          quote_reference = NULL,
          updated_at = NOW()
        WHERE vehicle_id = ${vehicleId}
          AND status = 'flagged'
          AND fleet_marque_price IS NOT NULL
        RETURNING id
      `;
      if (result.length > 0) {
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
 * Clear the queue (removes pending/running items, keeps completed for history)
 */
export async function DELETE() {
  try {
    await sql`DELETE FROM lex_quote_queue WHERE status IN ('pending', 'running')`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing queue:", error);
    return NextResponse.json(
      { error: "Failed to clear queue" },
      { status: 500 }
    );
  }
}
