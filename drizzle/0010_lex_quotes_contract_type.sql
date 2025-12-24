-- Add contract_type column to lex_quotes
ALTER TABLE "lex_quotes" ADD COLUMN "contract_type" text;

-- Update existing rows to infer contract type from maintenance_included
-- Note: This assumes all existing quotes are CH (Contract Hire) not PCH
-- If there are PCH quotes, they would need manual correction
UPDATE "lex_quotes"
SET "contract_type" = CASE
  WHEN "maintenance_included" = true THEN 'CH'
  ELSE 'CHNM'
END
WHERE "contract_type" IS NULL;
