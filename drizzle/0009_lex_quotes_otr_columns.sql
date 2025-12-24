-- Add OTR and fleet discount columns to lex_quotes table
ALTER TABLE "lex_quotes" ADD COLUMN IF NOT EXISTS "otrp" integer;
ALTER TABLE "lex_quotes" ADD COLUMN IF NOT EXISTS "broker_otrp" integer;
ALTER TABLE "lex_quotes" ADD COLUMN IF NOT EXISTS "used_fleet_discount" boolean DEFAULT false;
ALTER TABLE "lex_quotes" ADD COLUMN IF NOT EXISTS "fleet_savings_percent" numeric(5, 2);
