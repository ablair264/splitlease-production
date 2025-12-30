/**
 * Download Vehicle Images API
 *
 * Downloads key view images from Imagin Studio CDN and uploads to Cloudflare R2.
 * Updates the vehicle's imageFolder field in the database.
 *
 * POST /api/admin/vehicles/[id]/download-images
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isR2Configured,
  uploadToR2,
  getVehicleImageFolder,
  R2_PUBLIC_URL,
} from "@/lib/r2/client";

// Imagin Studio angle mappings for key views
const IMAGE_VIEWS = [
  { name: "front_view", angle: 1 },
  { name: "front_right", angle: 5 },
  { name: "right_view", angle: 9 },
  { name: "back_view", angle: 17 },
  { name: "left_view", angle: 25 },
  { name: "front_left", angle: 29 },
] as const;

/**
 * Download an image from a URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VehicleImageDownloader/1.0)",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Failed to download: ${url} - ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      console.error(`Not an image: ${url} - ${contentType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return null;
  }
}

/**
 * Build Imagin Studio URL for a specific angle
 */
function buildImaginUrl(baseUrl: string, angle: number): string {
  // Replace the angle parameter in the URL
  return baseUrl.replace(/angle=\d+/, `angle=${angle}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
        },
        { status: 500 }
      );
    }

    // Fetch the vehicle
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        capCode: vehicles.capCode,
        capId: vehicles.capId,
        manufacturer: vehicles.manufacturer,
        model: vehicles.model,
        imageUrl: vehicles.imageUrl,
        imageFolder: vehicles.imageFolder,
      })
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Check if vehicle has an image URL
    if (!vehicle.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Vehicle has no Imagin Studio URL configured",
        },
        { status: 400 }
      );
    }

    // Generate the folder path
    const imageFolder = getVehicleImageFolder(
      vehicle.manufacturer || "unknown",
      vehicle.model || "unknown",
      vehicle.capCode || vehicle.id.slice(0, 8)
    );

    console.log(
      `[Download Images] Starting for ${vehicle.manufacturer} ${vehicle.model}`
    );
    console.log(`[Download Images] Folder: ${imageFolder}`);

    // Download and upload each view
    const results: { view: string; success: boolean; url?: string }[] = [];

    for (const view of IMAGE_VIEWS) {
      const imageUrl = buildImaginUrl(vehicle.imageUrl, view.angle);
      console.log(`[Download Images] Downloading ${view.name} (angle ${view.angle})...`);

      const imageBuffer = await downloadImage(imageUrl);

      if (!imageBuffer) {
        results.push({ view: view.name, success: false });
        continue;
      }

      // Upload to R2 - Imagin returns WebP images
      const r2Key = `${imageFolder}/${view.name}.webp`;

      try {
        const publicUrl = await uploadToR2(r2Key, imageBuffer, "image/webp");
        results.push({ view: view.name, success: true, url: publicUrl });
        console.log(`[Download Images] Uploaded ${view.name}: ${publicUrl}`);
      } catch (uploadError) {
        console.error(`[Download Images] Upload failed for ${view.name}:`, uploadError);
        results.push({ view: view.name, success: false });
      }
    }

    // Count successes
    const successCount = results.filter((r) => r.success).length;

    // Update the imageFolder if at least one image was uploaded
    if (successCount > 0) {
      await db
        .update(vehicles)
        .set({ imageFolder })
        .where(eq(vehicles.id, id));
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
      },
      imageFolder,
      baseUrl: R2_PUBLIC_URL,
      results,
      summary: {
        total: IMAGE_VIEWS.length,
        uploaded: successCount,
        failed: IMAGE_VIEWS.length - successCount,
      },
    });
  } catch (error) {
    console.error("[Download Images] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
