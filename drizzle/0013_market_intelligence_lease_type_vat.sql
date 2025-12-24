ALTER TABLE "market_intelligence_deals"
  ADD COLUMN IF NOT EXISTS "lease_type" text;

ALTER TABLE "market_intelligence_deals"
  ADD COLUMN IF NOT EXISTS "vat_included" boolean;

CREATE INDEX IF NOT EXISTS "idx_mi_deals_lease_type" ON "market_intelligence_deals" ("lease_type");
CREATE INDEX IF NOT EXISTS "idx_mi_deals_vat_included" ON "market_intelligence_deals" ("vat_included");
