-- Vehicle Status table (Special Offers, Enable/Disable)
CREATE TABLE IF NOT EXISTS "vehicle_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id") ON DELETE CASCADE,
  "is_special_offer" boolean DEFAULT false,
  "special_offer_at" timestamp,
  "special_offer_notes" text,
  "is_enabled" boolean DEFAULT true,
  "disabled_at" timestamp,
  "disabled_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_vehicle_status_vehicle_id" ON "vehicle_status" ("vehicle_id");
CREATE INDEX IF NOT EXISTS "idx_vehicle_status_special_offer" ON "vehicle_status" ("is_special_offer");
CREATE INDEX IF NOT EXISTS "idx_vehicle_status_enabled" ON "vehicle_status" ("is_enabled");

-- User Table Views table (Saved column layouts & filters)
CREATE TABLE IF NOT EXISTS "user_table_views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "view_name" text NOT NULL,
  "table_id" text NOT NULL,
  "column_order" jsonb,
  "column_visibility" jsonb,
  "column_widths" jsonb,
  "filters" jsonb,
  "sort_by" text,
  "sort_order" text,
  "is_default" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_user_table_views_user_table" ON "user_table_views" ("user_id", "table_id");
CREATE INDEX IF NOT EXISTS "idx_user_table_views_default" ON "user_table_views" ("user_id", "table_id", "is_default");
