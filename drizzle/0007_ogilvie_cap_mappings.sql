-- Ogilvie CAP Code Mappings table
-- Stores derivative name → CAP code mappings scraped from Ogilvie website
-- Used for exact matching before falling back to fuzzy matching

CREATE TABLE IF NOT EXISTS "ogilvie_cap_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "derivative_full_name" text NOT NULL UNIQUE,
  "cap_id" text,
  "cap_code" text,
  "manufacturer" text,
  "model" text,
  "scraped_at" timestamp DEFAULT now() NOT NULL,
  "import_batch_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Index for looking up by CAP ID (for joining with Lex data)
CREATE INDEX IF NOT EXISTS "ogilvie_cap_mappings_cap_id_idx" ON "ogilvie_cap_mappings" ("cap_id");

-- Index for manufacturer/model queries
CREATE INDEX IF NOT EXISTS "ogilvie_cap_mappings_mfr_model_idx" ON "ogilvie_cap_mappings" ("manufacturer", "model");
