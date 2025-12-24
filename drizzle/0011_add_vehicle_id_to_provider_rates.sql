-- Migration: Add vehicle_id to provider_rates and unique constraint to vehicles.cap_code
-- This establishes vehicles as the single source of truth

-- Step 1: Add vehicle_id column to provider_rates (nullable initially for backfill)
ALTER TABLE "provider_rates"
ADD COLUMN "vehicle_id" uuid REFERENCES "vehicles"("id") ON DELETE SET NULL;

-- Step 2: Create index for faster lookups
CREATE INDEX "idx_provider_rates_vehicle_id" ON "provider_rates" ("vehicle_id");

-- Step 3: Add unique constraint to vehicles.cap_code
-- First, we need to handle any duplicates. This creates a unique index that ignores NULLs.
CREATE UNIQUE INDEX "idx_vehicles_cap_code_unique" ON "vehicles" ("cap_code") WHERE "cap_code" IS NOT NULL;

-- Step 4: Add index on vehicles.cap_code for faster matching
CREATE INDEX IF NOT EXISTS "idx_vehicles_cap_code" ON "vehicles" ("cap_code");

-- Step 5: Add index on provider_rates.cap_code for backfill matching
CREATE INDEX IF NOT EXISTS "idx_provider_rates_cap_code" ON "provider_rates" ("cap_code");
