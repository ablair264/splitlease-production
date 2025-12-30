/**
 * Cloudflare R2 Client
 *
 * Uses AWS S3 SDK with S3-compatible API for Cloudflare R2.
 * Requires environment variables:
 *   - R2_ACCOUNT_ID
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET_NAME (defaults to "gateway2lease")
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "vehicle-images";

// Public R2 URL for accessing uploaded files
export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_IMAGE_URL ||
  "https://pub-112aac78c28540e8804e41f113416d30.r2.dev/gateway2lease";

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Get the S3-compatible R2 client
 */
export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = "image/webp"
): Promise<string> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return the public URL
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Generate a folder path for a vehicle
 */
export function getVehicleImageFolder(
  manufacturer: string,
  model: string,
  capCode: string
): string {
  // Sanitize strings for use in path
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const mfr = sanitize(manufacturer);
  const mdl = sanitize(model);
  const cap = sanitize(capCode);

  return `${mfr}/${mdl}-${cap}`;
}
