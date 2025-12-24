CREATE TABLE IF NOT EXISTS "vehicle_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"provider_name" text NOT NULL,
	"term" integer NOT NULL,
	"annual_mileage" integer NOT NULL,
	"monthly_rental" integer NOT NULL,
	"excess_mileage" text,
	"upload_batch_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cap_code" text,
	"manufacturer" text NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"model_year" text,
	"p11d" integer,
	"otr" integer,
	"engine_size" integer,
	"transmission" text,
	"doors" integer,
	"fuel_type" text,
	"co2" integer,
	"mpg" text,
	"body_style" text,
	"insurance_group" integer,
	"euro_class" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicle_pricing" ADD CONSTRAINT "vehicle_pricing_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
