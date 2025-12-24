-- Make cap_code nullable in provider_rates to allow Ogilvie imports without CAP codes
ALTER TABLE provider_rates ALTER COLUMN cap_code DROP NOT NULL;
