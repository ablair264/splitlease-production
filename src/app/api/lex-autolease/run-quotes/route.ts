import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lexQuotes, lexQuoteRequests, lexSessions, fleetMarqueTerms } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { LexApiClient } from "@/lib/lex/api-client";

export type QuoteVehicle = {
  makeCode: string;
  modelCode: string;
  variantCode: string;
  make: string;
  model: string;
  variant: string;
  capCode?: string;
  vehicleId?: string;
};

/**
 * POST /api/lex-autolease/run-quotes
 * Run quotes for selected vehicles using server-side API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicles,
      term,
      mileage,
      maintenanceIncluded = false,
      paymentPlan = "spread_3_down",
      contractType = "contract_hire_without_maintenance",
    } = body;

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: "No vehicles provided" },
        { status: 400 }
      );
    }

    if (!term || !mileage) {
      return NextResponse.json(
        { error: "Term and mileage are required" },
        { status: 400 }
      );
    }

    // Get valid session
    const client = await LexApiClient.getValidSession();

    if (!client) {
      return NextResponse.json(
        {
          error: "No valid Lex session found",
          requiresSession: true,
          message: "Please capture a session from the Lex portal first.",
        },
        { status: 401 }
      );
    }

    // Create batch record
    const batchId = `lex_${Date.now()}`;
    const [batch] = await db
      .insert(lexQuoteRequests)
      .values({
        batchId,
        status: "running",
        totalVehicles: vehicles.length,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        term,
        annualMileage: mileage,
        maintenanceIncluded,
        startedAt: new Date(),
      })
      .returning();

    // Process vehicles
    const results: Array<{
      vehicle: QuoteVehicle;
      success: boolean;
      monthlyRental?: number;
      monthlyRentalIncVat?: number;
      initialRental?: number;
      otrp?: number;
      brokerOtrp?: number;
      usedFleetDiscount?: boolean;
      fleetSavingsPercent?: number;
      error?: string;
    }> = [];

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i] as QuoteVehicle;

      try {
        // Step 1: Look up fleet discounted price if CAP code available
        let fleetDiscountedPrice: number | null = null;
        let fleetDiscountPercent: number | null = null;

        if (vehicle.capCode) {
          const fleetTerms = await db
            .select({
              discountedPrice: fleetMarqueTerms.discountedPrice,
              discountPercent: fleetMarqueTerms.discountPercent,
            })
            .from(fleetMarqueTerms)
            .where(eq(fleetMarqueTerms.capCode, vehicle.capCode))
            .limit(1);

          if (fleetTerms.length > 0 && fleetTerms[0].discountedPrice) {
            // Convert from pence to pounds
            fleetDiscountedPrice = fleetTerms[0].discountedPrice / 100;
            fleetDiscountPercent = fleetTerms[0].discountPercent ? parseFloat(fleetTerms[0].discountPercent) : null;
          }
        }

        // Step 2: Run initial quote to get Lex standard OTR
        const initialResult = await client.runQuote({
          makeId: vehicle.makeCode,
          modelId: vehicle.modelCode,
          variantId: vehicle.variantCode,
          term,
          mileage,
          paymentPlan,
          contractType,
        });

        if (!initialResult.success) {
          throw new Error(initialResult.error || "Initial quote failed");
        }

        // Step 3: Check if fleet price is lower than Lex OTR
        let finalResult = initialResult;
        let usedFleetDiscount = false;

        if (fleetDiscountedPrice && initialResult.otrp && fleetDiscountedPrice < initialResult.otrp) {
          // Fleet price is lower - re-run quote with custom broker OTRP
          const discountedResult = await client.runQuote({
            makeId: vehicle.makeCode,
            modelId: vehicle.modelCode,
            variantId: vehicle.variantCode,
            term,
            mileage,
            paymentPlan,
            contractType,
            brokerOtrp: fleetDiscountedPrice,
          });

          if (discountedResult.success) {
            finalResult = discountedResult;
            usedFleetDiscount = true;
          }
        }

        if (finalResult.success) {
          console.log("Quote result for", vehicle.make, vehicle.model, ":", {
            monthlyRental: finalResult.monthlyRental,
            otrp: initialResult.otrp,
            brokerOtrp: usedFleetDiscount ? fleetDiscountedPrice : null,
            usedFleetDiscount,
          });

          // Save quote to database
          await db.insert(lexQuotes).values({
            vehicleId: vehicle.vehicleId || null,
            capCode: vehicle.capCode || null,
            makeCode: vehicle.makeCode,
            modelCode: vehicle.modelCode,
            variantCode: vehicle.variantCode,
            make: vehicle.make,
            model: vehicle.model,
            variant: vehicle.variant,
            term,
            annualMileage: mileage,
            paymentPlan,
            initialRental: finalResult.initialRental ? Math.round(finalResult.initialRental * 100) : null,
            monthlyRental: finalResult.monthlyRental ? Math.round(finalResult.monthlyRental * 100) : null,
            otrp: initialResult.otrp ? Math.round(initialResult.otrp * 100) : null, // Original Lex OTR in pence
            brokerOtrp: usedFleetDiscount && fleetDiscountedPrice ? Math.round(fleetDiscountedPrice * 100) : null, // Fleet discounted OTR in pence
            usedFleetDiscount,
            fleetSavingsPercent: fleetDiscountPercent ? String(fleetDiscountPercent) : null,
            maintenanceIncluded,
            contractType,
            quoteReference: finalResult.quoteId,
            status: "success",
            requestBatchId: batchId,
            quotedAt: new Date(),
          });

          successCount++;
          results.push({
            vehicle,
            success: true,
            monthlyRental: finalResult.monthlyRental,
            monthlyRentalIncVat: finalResult.monthlyRentalIncVat,
            initialRental: finalResult.initialRental,
            otrp: initialResult.otrp, // Original Lex OTR for comparison
            brokerOtrp: usedFleetDiscount ? fleetDiscountedPrice! : undefined,
            usedFleetDiscount,
            fleetSavingsPercent: fleetDiscountPercent || undefined,
          });
        } else {
          // Save error quote
          await db.insert(lexQuotes).values({
            vehicleId: vehicle.vehicleId || null,
            capCode: vehicle.capCode || null,
            makeCode: vehicle.makeCode,
            modelCode: vehicle.modelCode,
            variantCode: vehicle.variantCode,
            make: vehicle.make,
            model: vehicle.model,
            variant: vehicle.variant,
            term,
            annualMileage: mileage,
            paymentPlan,
            maintenanceIncluded,
            contractType,
            status: "error",
            errorMessage: finalResult.error,
            requestBatchId: batchId,
          });

          errorCount++;
          errors.push(`${vehicle.make} ${vehicle.model}: ${finalResult.error}`);
          results.push({
            vehicle,
            success: false,
            error: finalResult.error,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errorCount++;
        errors.push(`${vehicle.make} ${vehicle.model}: ${errorMsg}`);
        results.push({
          vehicle,
          success: false,
          error: errorMsg,
        });
      }

      // Update progress
      await db
        .update(lexQuoteRequests)
        .set({
          processedCount: i + 1,
          successCount,
          errorCount,
        })
        .where(eq(lexQuoteRequests.batchId, batchId));

      // Update session last used
      await db
        .update(lexSessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(lexSessions.isValid, true));

      // Small delay between requests
      if (i < vehicles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Finalize batch
    const finalStatus = errorCount > vehicles.length / 2 ? "failed" : "completed";
    await db
      .update(lexQuoteRequests)
      .set({
        status: finalStatus,
        processedCount: vehicles.length,
        successCount,
        errorCount,
        errorLog: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      })
      .where(eq(lexQuoteRequests.batchId, batchId));

    return NextResponse.json({
      success: true,
      batchId,
      totalVehicles: vehicles.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Error running quotes:", error);

    // Check if session became invalid
    if (error instanceof Error && error.message.includes("401")) {
      // Mark session as invalid
      await db
        .update(lexSessions)
        .set({ isValid: false })
        .where(eq(lexSessions.isValid, true));

      return NextResponse.json(
        {
          error: "Session expired or invalid",
          requiresSession: true,
          message: "Your Lex session has expired. Please capture a new session.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to run quotes", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
