import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Cache for import IDs to avoid repeated lookups
const importIdCache: Record<string, string> = {};

/**
 * Get or create a ratebook_imports record for Drivalia automation quotes
 * This is needed because provider_rates requires an import_id
 */
async function getOrCreateDrivaliaAutomationImport(contractType: string): Promise<string | null> {
  const cacheKey = `drivalia_automation_${contractType}`;

  // Check cache first
  if (importIdCache[cacheKey]) {
    return importIdCache[cacheKey];
  }

  try {
    // Look for existing Drivalia automation import for this contract type
    const existing = await sql`
      SELECT id FROM ratebook_imports
      WHERE provider_code = 'drivalia'
        AND contract_type = ${contractType}
        AND batch_id LIKE 'drivalia_automation_%'
        AND is_latest = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      importIdCache[cacheKey] = existing[0].id as string;
      return importIdCache[cacheKey];
    }

    // Create new import batch for Drivalia automation
    const batchId = `drivalia_automation_${contractType.toLowerCase()}_${Date.now()}`;
    const result = await sql`
      INSERT INTO ratebook_imports (
        provider_code,
        contract_type,
        batch_id,
        file_name,
        status,
        is_latest,
        created_at,
        completed_at
      ) VALUES (
        'drivalia',
        ${contractType},
        ${batchId},
        'Drivalia Automation Quotes',
        'completed',
        true,
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    if (result.length > 0) {
      importIdCache[cacheKey] = result[0].id as string;
      return importIdCache[cacheKey];
    }

    return null;
  } catch (error) {
    console.error("Failed to get/create Drivalia automation import:", error);
    return null;
  }
}

type QueueItemInput = {
  vehicleId: string;
  capCode: string;
  manufacturer: string;
  model: string;
  variant: string;
  term: number;
  mileage: number;
  contractType: string;
};

type QueueItemResult = {
  quoteId?: string;
  monthlyRental?: number;
  monthlyRentalIncVat?: number;
  initialRental?: number;
  p11d?: number;
};

/**
 * GET /api/drivalia/quote-queue
 * Get current quote queue status from database
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const historyOnly = searchParams.get("history") === "true";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Use separate queries for history vs all items
    const rows = historyOnly
      ? await sql`
          SELECT
            id,
            vehicle_id as "vehicleId",
            cap_code as "capCode",
            manufacturer,
            model,
            variant,
            term,
            annual_mileage as "annualMileage",
            contract_type as "contractType",
            status,
            monthly_rental as "monthlyRental",
            initial_rental as "initialRental",
            quote_reference as "quoteReference",
            error,
            batch_id as "batchId",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM drivalia_quotes
          WHERE status IN ('complete', 'error')
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT
            id,
            vehicle_id as "vehicleId",
            cap_code as "capCode",
            manufacturer,
            model,
            variant,
            term,
            annual_mileage as "annualMileage",
            contract_type as "contractType",
            status,
            monthly_rental as "monthlyRental",
            initial_rental as "initialRental",
            quote_reference as "quoteReference",
            error,
            batch_id as "batchId",
            created_at as "createdAt",
            updated_at as "updatedAt"
          FROM drivalia_quotes
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    // Transform to match the expected format
    const queue = rows.map((row) => ({
      vehicleId: row.vehicleId,
      capCode: row.capCode,
      manufacturer: row.manufacturer,
      model: row.model,
      variant: row.variant,
      term: row.term,
      mileage: row.annualMileage,
      contractType: row.contractType,
      status: row.status,
      result: row.monthlyRental
        ? {
            quoteId: row.quoteReference,
            monthlyRental: row.monthlyRental / 100, // Convert from pence to pounds
            initialRental: row.initialRental ? row.initialRental / 100 : undefined,
          }
        : undefined,
      error: row.error,
      batchId: row.batchId,
      createdAt: row.createdAt,
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
    console.error("Error fetching Drivalia quote queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue", queue: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drivalia/quote-queue
 * Add vehicles to the quote queue
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as { items: QueueItemInput[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    // Create a batch ID for this group of quotes
    const batchId = `drivalia_${Date.now()}`;

    // Clear existing pending/running items
    await sql`DELETE FROM drivalia_quotes WHERE status IN ('pending', 'running')`;

    // Insert all items into the queue
    for (const item of items) {
      await sql`
        INSERT INTO drivalia_quotes (
          vehicle_id,
          cap_code,
          manufacturer,
          model,
          variant,
          term,
          annual_mileage,
          contract_type,
          status,
          batch_id
        ) VALUES (
          ${item.vehicleId || null},
          ${item.capCode},
          ${item.manufacturer},
          ${item.model},
          ${item.variant},
          ${item.term},
          ${item.mileage},
          ${item.contractType},
          'pending',
          ${batchId}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      batchId,
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
    const { vehicleId, capCode, term, mileage, contractType, status, result, error } = body as {
      vehicleId?: string;
      capCode?: string;
      term?: number;
      mileage?: number;
      contractType?: string;
      status: "running" | "complete" | "error";
      result?: QueueItemResult;
      error?: string;
    };

    // Build WHERE clause - can match by vehicleId OR by quote parameters
    // This handles both cases: when extension sends vehicleId or when it sends quote params
    if (!vehicleId && (!capCode || !term || !mileage || !contractType)) {
      return NextResponse.json(
        { error: "Must provide vehicleId or (capCode, term, mileage, contractType)" },
        { status: 400 }
      );
    }

    // Update based on status
    if (status === "running") {
      if (vehicleId) {
        await sql`
          UPDATE drivalia_quotes
          SET status = 'running', updated_at = NOW()
          WHERE vehicle_id = ${vehicleId} AND status = 'pending'
        `;
      } else {
        await sql`
          UPDATE drivalia_quotes
          SET status = 'running', updated_at = NOW()
          WHERE cap_code = ${capCode}
            AND term = ${term}
            AND annual_mileage = ${mileage}
            AND contract_type = ${contractType}
            AND status = 'pending'
        `;
      }
      return NextResponse.json({ success: true });
    }

    if (status === "error") {
      if (vehicleId) {
        await sql`
          UPDATE drivalia_quotes
          SET status = 'error', error = ${error || null}, updated_at = NOW()
          WHERE vehicle_id = ${vehicleId} AND status IN ('pending', 'running')
        `;
      } else {
        await sql`
          UPDATE drivalia_quotes
          SET status = 'error', error = ${error || null}, updated_at = NOW()
          WHERE cap_code = ${capCode}
            AND term = ${term}
            AND annual_mileage = ${mileage}
            AND contract_type = ${contractType}
            AND status IN ('pending', 'running')
        `;
      }
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
      const p11dPence = result.p11d
        ? Math.round(result.p11d * 100)
        : null;

      if (vehicleId) {
        await sql`
          UPDATE drivalia_quotes
          SET
            status = 'complete',
            monthly_rental = ${monthlyRentalPence},
            initial_rental = ${initialRentalPence},
            quote_reference = ${result.quoteId || null},
            updated_at = NOW()
          WHERE vehicle_id = ${vehicleId} AND status IN ('pending', 'running')
        `;
      } else {
        await sql`
          UPDATE drivalia_quotes
          SET
            status = 'complete',
            monthly_rental = ${monthlyRentalPence},
            initial_rental = ${initialRentalPence},
            quote_reference = ${result.quoteId || null},
            updated_at = NOW()
          WHERE cap_code = ${capCode}
            AND term = ${term}
            AND annual_mileage = ${mileage}
            AND contract_type = ${contractType}
            AND status IN ('pending', 'running')
        `;
      }

      // Get queue item details for provider_rates update
      const queueItemResult = vehicleId
        ? await sql`SELECT * FROM drivalia_quotes WHERE vehicle_id = ${vehicleId} ORDER BY created_at DESC LIMIT 1`
        : await sql`SELECT * FROM drivalia_quotes WHERE cap_code = ${capCode} AND term = ${term} AND annual_mileage = ${mileage} AND contract_type = ${contractType} ORDER BY created_at DESC LIMIT 1`;
      const queueItem = queueItemResult[0];

      // Update or insert into provider_rates
      if (queueItem && monthlyRentalPence) {
        try {
          // Check if rate already exists with same parameters
          const existingRate = await sql`
            SELECT id, total_rental
            FROM provider_rates
            WHERE provider_code = 'drivalia'
              AND cap_code = ${queueItem.cap_code}
              AND term = ${queueItem.term}
              AND annual_mileage = ${queueItem.annual_mileage}
              AND contract_type = ${queueItem.contract_type}
            LIMIT 1
          `;

          if (existingRate.length > 0) {
            // Rate exists - check if price is different
            const existingPrice = existingRate[0].total_rental;
            if (existingPrice !== monthlyRentalPence) {
              // Price changed - update the rate
              await sql`
                UPDATE provider_rates
                SET
                  total_rental = ${monthlyRentalPence},
                  p11d = ${p11dPence},
                  updated_at = NOW()
                WHERE id = ${existingRate[0].id}
              `;
              console.log(
                `[ProviderRates] Updated Drivalia rate for ${queueItem.manufacturer} ${queueItem.model}: £${(existingPrice / 100).toFixed(2)} → £${(monthlyRentalPence / 100).toFixed(2)}`
              );
            } else {
              console.log(
                `[ProviderRates] Drivalia rate unchanged for ${queueItem.manufacturer} ${queueItem.model}: £${(monthlyRentalPence / 100).toFixed(2)}`
              );
            }
          } else {
            // Rate doesn't exist - need to get or create an import batch for Drivalia automation
            const importId = await getOrCreateDrivaliaAutomationImport(queueItem.contract_type);

            if (importId) {
              await sql`
                INSERT INTO provider_rates (
                  cap_code,
                  vehicle_id,
                  import_id,
                  provider_code,
                  contract_type,
                  manufacturer,
                  model,
                  variant,
                  term,
                  annual_mileage,
                  total_rental,
                  p11d,
                  created_at,
                  updated_at
                ) VALUES (
                  ${queueItem.cap_code},
                  ${queueItem.vehicle_id},
                  ${importId},
                  'drivalia',
                  ${queueItem.contract_type},
                  ${queueItem.manufacturer},
                  ${queueItem.model},
                  ${queueItem.variant},
                  ${queueItem.term},
                  ${queueItem.annual_mileage},
                  ${monthlyRentalPence},
                  ${p11dPence},
                  NOW(),
                  NOW()
                )
              `;
              console.log(
                `[ProviderRates] Inserted new Drivalia rate for ${queueItem.manufacturer} ${queueItem.model}: £${(monthlyRentalPence / 100).toFixed(2)}`
              );
            }
          }
        } catch (prError) {
          console.error("Failed to update provider_rates for Drivalia:", prError);
        }
      }
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
 * Clear the entire queue
 */
export async function DELETE() {
  try {
    await sql`DELETE FROM drivalia_quotes`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing Drivalia queue:", error);
    return NextResponse.json(
      { error: "Failed to clear queue" },
      { status: 500 }
    );
  }
}
