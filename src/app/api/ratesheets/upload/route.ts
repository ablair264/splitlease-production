import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, vehicles, vehiclePricing, ratebookUploads, type ColumnMappings } from "@/lib/db";
import { eq } from "drizzle-orm";

// Standard field definitions
const STANDARD_FIELDS = {
  cap_code: { label: 'CAP Code', required: false },
  manufacturer: { label: 'Manufacturer', required: true },
  model: { label: 'Model', required: true },
  variant: { label: 'Variant', required: false },
  monthly_rental: { label: 'Monthly Rental', required: true },
  p11d: { label: 'P11D Price', required: true },
  otr_price: { label: 'OTR Price', required: false },
  term: { label: 'Term (Months)', required: false },
  mileage: { label: 'Annual Mileage', required: false },
  mpg: { label: 'Fuel Economy', required: false },
  co2: { label: 'CO2 Emissions', required: false },
  fuel_type: { label: 'Fuel Type', required: false },
  electric_range: { label: 'Electric Range', required: false },
  insurance_group: { label: 'Insurance Group', required: false },
  body_style: { label: 'Body Style', required: false },
  transmission: { label: 'Transmission', required: false },
  euro_rating: { label: 'Euro Rating', required: false },
  upfront: { label: 'Upfront Payment', required: false },
};

// Normalize P11D value to pence
// Handles various CSV formats: pounds, pence, or decimal
function normalizeP11D(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const numValue = parseFloat(String(value).replace(/[£,\s]/g, ''));
  if (isNaN(numValue) || numValue === 0) return null;

  // Logic to detect format:
  // - If value > 100000, likely already in pence (e.g., 1420000 = £14,200)
  // - If value > 1000 and < 100000, likely in pounds (e.g., 14200 = £14,200) - multiply by 100
  // - If value < 1000, likely a data issue or already normalized - multiply by 100
  if (numValue > 100000) {
    // Already in pence
    return Math.round(numValue);
  } else {
    // In pounds, convert to pence
    return Math.round(numValue * 100);
  }
}

// Normalize monthly rental to pence
function normalizeMonthlyRental(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;

  const numValue = parseFloat(String(value).replace(/[£,\s]/g, ''));
  if (isNaN(numValue) || numValue === 0) return 0;

  // Monthly rental typically £100-£2000
  // If value > 10000, likely already in pence
  if (numValue > 10000) {
    return Math.round(numValue);
  } else {
    return Math.round(numValue * 100);
  }
}

// Calculate deal score using pence values
function calculateScore(monthlyPence: number, p11dPence: number, term: number): number {
  if (monthlyPence === 0 || p11dPence === 0) return 0;

  const totalCost = monthlyPence * term;
  const costRatio = (totalCost / p11dPence) * 100;

  // If ratio is > 200%, likely bad data
  if (costRatio > 200) return 0;

  if (costRatio <= 30) return 100;
  if (costRatio <= 40) return 90;
  if (costRatio <= 50) return 80;
  if (costRatio <= 60) return 70;
  if (costRatio <= 70) return 60;
  if (costRatio <= 80) return 50;
  if (costRatio <= 90) return 40;
  if (costRatio <= 100) return 30;
  return 20;
}

function getScoreCategory(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 70) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 30) return 'Fair';
  return 'Poor';
}

// Parse CSV content
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/"/g, ''));

    return cells;
  });

  return { headers, rows };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      fileContent,
      fileName,
      providerName,
      mappings,
      testMode = false
    } = body as {
      fileContent: string;
      fileName: string;
      providerName: string;
      mappings: ColumnMappings;
      testMode?: boolean;
    };

    if (!fileContent || !providerName || !mappings) {
      return NextResponse.json(
        { error: "File content, provider name, and mappings are required" },
        { status: 400 }
      );
    }

    // Validate required mappings
    const requiredFields = Object.entries(STANDARD_FIELDS)
      .filter(([_, config]) => config.required)
      .map(([field]) => field);

    const missingRequired = requiredFields.filter(
      field => mappings[field as keyof ColumnMappings] === undefined
    );

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: `Missing required field mappings: ${missingRequired.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse CSV
    const { headers, rows } = parseCSV(fileContent);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in file" },
        { status: 400 }
      );
    }

    // Create upload batch record
    const [uploadBatch] = await db.insert(ratebookUploads).values({
      providerName,
      fileName,
      totalRows: rows.length,
      status: 'processing',
      startedAt: new Date(),
    }).returning();

    const batchId = uploadBatch.id;
    const processedVehicles: Array<Record<string, unknown> & { score: number; scoreCategory: string }> = [];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process rows (limit to 10 in test mode)
    const maxRows = testMode ? Math.min(10, rows.length) : rows.length;

    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];

      try {
        // Extract data using mappings
        const vehicleData: Record<string, unknown> = {};

        for (const [field, colIndex] of Object.entries(mappings)) {
          if (colIndex !== undefined && colIndex !== null && row[colIndex]) {
            vehicleData[field] = row[colIndex];
          }
        }

        // Skip if missing required fields
        if (!vehicleData.manufacturer || !vehicleData.model || !vehicleData.monthly_rental) {
          errors.push(`Row ${i + 2}: Missing required data`);
          errorCount++;
          continue;
        }

        // Normalize monetary values
        const monthlyPence = normalizeMonthlyRental(vehicleData.monthly_rental);
        const p11dPence = normalizeP11D(vehicleData.p11d);
        const term = vehicleData.term ? parseInt(String(vehicleData.term)) : 36;

        // Calculate score using normalized values
        const score = calculateScore(monthlyPence, p11dPence || 0, term);
        const scoreCategory = getScoreCategory(score);

        // Find or create vehicle
        let vehicleId: string | null = null;

        const manufacturer = String(vehicleData.manufacturer).toUpperCase();
        const model = String(vehicleData.model);
        const variant = vehicleData.variant ? String(vehicleData.variant) : model;

        // Try to find existing vehicle by cap_code or manufacturer/model/variant
        let existingVehicle = null;

        if (vehicleData.cap_code) {
          existingVehicle = await db.query.vehicles.findFirst({
            where: eq(vehicles.capCode, String(vehicleData.cap_code)),
          });
        }

        if (!existingVehicle) {
          // Create new vehicle with normalized P11D
          const [newVehicle] = await db.insert(vehicles).values({
            capCode: vehicleData.cap_code ? String(vehicleData.cap_code) : null,
            manufacturer,
            model,
            variant,
            p11d: p11dPence,
            otr: vehicleData.otr_price ? normalizeP11D(vehicleData.otr_price) : null,
            fuelType: vehicleData.fuel_type ? String(vehicleData.fuel_type) : null,
            co2: vehicleData.co2 ? parseInt(String(vehicleData.co2)) : null,
            mpg: vehicleData.mpg ? String(vehicleData.mpg) : null,
            transmission: vehicleData.transmission ? String(vehicleData.transmission) : null,
            bodyStyle: vehicleData.body_style ? String(vehicleData.body_style) : null,
            insuranceGroup: vehicleData.insurance_group ? parseInt(String(vehicleData.insurance_group)) : null,
            euroClass: vehicleData.euro_rating ? String(vehicleData.euro_rating) : null,
          }).returning({ id: vehicles.id });

          vehicleId = newVehicle.id;
        } else {
          vehicleId = existingVehicle.id;
        }

        // Insert pricing data with normalized monthly rental
        await db.insert(vehiclePricing).values({
          vehicleId: vehicleId!,
          providerName,
          term,
          annualMileage: vehicleData.mileage ? parseInt(String(vehicleData.mileage)) : 10000,
          monthlyRental: monthlyPence,
          uploadBatchId: batchId,
        });

        processedVehicles.push({
          ...vehicleData,
          vehicleId,
          score,
          scoreCategory,
        });

        successCount++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Update upload batch
    await db.update(ratebookUploads)
      .set({
        processedRows: successCount + errorCount,
        successRows: successCount,
        errorRows: errorCount,
        status: errorCount > 0 && successCount === 0 ? 'failed' : 'completed',
        errorLog: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      })
      .where(eq(ratebookUploads.id, batchId));

    // Calculate stats
    const scores = processedVehicles.map(v => v.score);
    const stats = {
      totalVehicles: processedVehicles.length,
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
        : 0,
      topScore: scores.length > 0 ? Math.max(...scores) : 0,
      scoreDistribution: {
        exceptional: processedVehicles.filter(v => v.score >= 90).length,
        excellent: processedVehicles.filter(v => v.score >= 70 && v.score < 90).length,
        good: processedVehicles.filter(v => v.score >= 50 && v.score < 70).length,
        fair: processedVehicles.filter(v => v.score >= 30 && v.score < 50).length,
        poor: processedVehicles.filter(v => v.score < 30).length,
      },
    };

    // Sort by score for top deals
    processedVehicles.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      batchId,
      fileName,
      provider: providerName,
      stats,
      topDeals: processedVehicles.slice(0, 100),
      errors: errors.slice(0, 10),
      testMode,
    });

  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process upload" },
      { status: 500 }
    );
  }
}
