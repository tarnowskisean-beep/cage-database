-- Policies Table
CREATE TABLE IF NOT EXISTS "Policies" (
    "PolicyID" SERIAL PRIMARY KEY,
    "PolicyType" TEXT NOT NULL, -- e.g. 'ToS', 'Privacy'
    "Version" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- PolicyAcceptances Table
CREATE TABLE IF NOT EXISTS "PolicyAcceptances" (
    "AcceptanceID" SERIAL PRIMARY KEY,
    "PolicyID" INT NOT NULL REFERENCES "Policies"("PolicyID"),
    "UserID" INT NOT NULL REFERENCES "Users"("UserID"),
    "AcceptedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add a default policy if none exists (Optional, prevents empty checks)
INSERT INTO "Policies" ("PolicyType", "Version", "Content", "IsActive")
SELECT 'ToS', '1.0', 'Terms of Service Content...', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Policies" WHERE "PolicyType" = 'ToS');
