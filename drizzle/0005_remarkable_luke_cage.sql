CREATE TABLE IF NOT EXISTS "fleet_marque_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cap_code" text NOT NULL,
	"vehicle_id" uuid,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"derivative" text,
	"cap_price" integer,
	"co2" integer,
	"discount_percent" numeric(5, 2),
	"discounted_price" integer,
	"savings" integer,
	"build_url" text,
	"scrape_batch_id" text,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lex_quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_vehicles" integer NOT NULL,
	"processed_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"term" integer NOT NULL,
	"annual_mileage" integer NOT NULL,
	"initial_rental_months" integer DEFAULT 1,
	"maintenance_included" boolean DEFAULT false,
	"error_log" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lex_quote_requests_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lex_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"cap_code" text,
	"make_code" text NOT NULL,
	"model_code" text NOT NULL,
	"variant_code" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"term" integer NOT NULL,
	"annual_mileage" integer NOT NULL,
	"initial_rental" integer,
	"monthly_rental" integer,
	"excess_mileage_charge" numeric(10, 2),
	"maintenance_included" boolean DEFAULT false,
	"quote_reference" text,
	"raw_response" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"request_batch_id" text,
	"quoted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ogilvie_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"contract_term" integer NOT NULL,
	"contract_mileage" integer NOT NULL,
	"product_id" text DEFAULT '1' NOT NULL,
	"payment_plan_id" text DEFAULT '263' NOT NULL,
	"total_vehicles" integer DEFAULT 0,
	"exported_rows" integer DEFAULT 0,
	"error_message" text,
	"csv_data" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ogilvie_exports_batch_id_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ogilvie_ratebook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"export_batch_id" text NOT NULL,
	"vehicle_id" uuid,
	"cap_code" text,
	"manufacturer" text NOT NULL,
	"model" text NOT NULL,
	"derivative" text,
	"contract_term" integer NOT NULL,
	"contract_mileage" integer NOT NULL,
	"monthly_rental" integer,
	"initial_rental" integer,
	"excess_mileage" numeric(10, 2),
	"co2" integer,
	"p11d" integer,
	"fuel_type" text,
	"transmission" text,
	"body_style" text,
	"bik_percent" numeric(5, 2),
	"bik_monthly" integer,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ogilvie_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_cookie" text NOT NULL,
	"verification_token" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provider_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_name" text NOT NULL,
	"column_mappings" jsonb NOT NULL,
	"file_format" text DEFAULT 'csv',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_mappings_provider_name_unique" UNIQUE("provider_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratebook_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_name" text NOT NULL,
	"file_name" text NOT NULL,
	"total_rows" integer NOT NULL,
	"processed_rows" integer DEFAULT 0,
	"success_rows" integer DEFAULT 0,
	"error_rows" integer DEFAULT 0,
	"status" text DEFAULT 'pending',
	"error_log" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "image_folder" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "lex_make_code" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "lex_model_code" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "lex_variant_code" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fleet_marque_terms" ADD CONSTRAINT "fleet_marque_terms_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lex_quotes" ADD CONSTRAINT "lex_quotes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ogilvie_ratebook" ADD CONSTRAINT "ogilvie_ratebook_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ogilvie_sessions" ADD CONSTRAINT "ogilvie_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
