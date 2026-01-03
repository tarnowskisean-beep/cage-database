-- Import System Schema

-- 1. Mapping Rules
CREATE TABLE IF NOT EXISTS "mapping_rules" (
    "id" SERIAL PRIMARY KEY,
    "source_system" VARCHAR(50) NOT NULL,
    "source_column" VARCHAR(100) NULL,
    "target_column" VARCHAR(100) NOT NULL,
    "default_value" TEXT NULL,
    "transformation_rule" VARCHAR(50) NULL,
    "priority" INT DEFAULT 0,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_mapping_rules_source" ON "mapping_rules"("source_system");
CREATE INDEX IF NOT EXISTS "idx_mapping_rules_target" ON "mapping_rules"("target_column");

-- 2. Import Sessions
CREATE TABLE IF NOT EXISTS "import_sessions" (
    "id" SERIAL PRIMARY KEY,
    "filename" VARCHAR(255) NOT NULL,
    "source_system" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('Pending', 'Processing', 'Completed', 'Failed')),
    "created_by" INT REFERENCES "Users"("UserID"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "row_count" INT DEFAULT 0,
    "processed_count" INT DEFAULT 0,
    "error_log" JSONB
);

-- 3. Staging Revenue
CREATE TABLE IF NOT EXISTS "staging_revenue" (
    "id" SERIAL PRIMARY KEY,
    "session_id" INT REFERENCES "import_sessions"("id") ON DELETE CASCADE,
    "source_row_data" JSONB,
    "normalized_data" JSONB,
    "validation_status" VARCHAR(20) DEFAULT 'Pending' CHECK ("validation_status" IN ('Pending', 'Valid', 'Invalid')),
    "validation_errors" JSONB,
    "defaults_applied" TEXT[],
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_staging_session" ON "staging_revenue"("session_id");

-- Seed Default Mapping Rules (Winred, Stripe, etc.)
INSERT INTO "mapping_rules" ("source_system", "target_column", "default_value", "priority")
VALUES 
('Winred', 'Gift Platform', 'Winred', 10),
('Winred', 'Gift Type', 'Online Source', 10),
('Winred', 'Gift Method', 'Credit Card', 10),
('Stripe', 'Gift Platform', 'Stripe', 10),
('Stripe', 'Gift Type', 'Online Source', 10),
('Stripe', 'Gift Method', 'Credit Card', 10),
('Anedot', 'Gift Platform', 'Anedot', 10),
('Anedot', 'Gift Type', 'Online Source', 10),
('Anedot', 'Gift Method', 'Credit Card', 10),
('Cage', 'Gift Platform', 'Chainbridge', 10),
('Cage', 'Gift Type', 'Individual/Trust/IRA', 10),
('Cage', 'Gift Method', 'Check', 10),
('*', 'IsInactive', 'false', 0) -- Global Default
ON CONFLICT DO NOTHING;
