-- Enable pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes to speed up fuzzy matching
CREATE INDEX IF NOT EXISTS trgm_idx_donors_firstname ON "Donors" USING gin ("FirstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_donors_lastname ON "Donors" USING gin ("LastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_donors_address ON "Donors" USING gin ("Address" gin_trgm_ops);
