-- CRM Updates for People Functionality

-- 1. Update Donors Table
ALTER TABLE "Donors"
ADD COLUMN IF NOT EXISTS "Bio" TEXT,
ADD COLUMN IF NOT EXISTS "ProfilePicture" TEXT, -- Storage Key
ADD COLUMN IF NOT EXISTS "AssignedStafferID" INT REFERENCES "Users"("UserID"),
ADD COLUMN IF NOT EXISTS "Deceased" BOOLEAN DEFAULT FALSE;

-- 2. Update Donations Table
ALTER TABLE "Donations"
ADD COLUMN IF NOT EXISTS "Designation" TEXT, -- E.g. Specific Fund
ADD COLUMN IF NOT EXISTS "ThankYouSentAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "TaxReceiptSentAt" TIMESTAMPTZ;

-- 3. Create DonorTasks Table
CREATE TABLE IF NOT EXISTS "DonorTasks" (
    "TaskID" SERIAL PRIMARY KEY,
    "DonorID" INT NOT NULL REFERENCES "Donors"("DonorID"),
    "Description" TEXT NOT NULL,
    "AssignedTo" INT REFERENCES "Users"("UserID"),
    "DueDate" TIMESTAMPTZ,
    "IsCompleted" BOOLEAN DEFAULT FALSE,
    "CreatedBy" INT REFERENCES "Users"("UserID"),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "CompletedAt" TIMESTAMPTZ
);

-- 4. Create DonorFiles Table
CREATE TABLE IF NOT EXISTS "DonorFiles" (
    "FileID" SERIAL PRIMARY KEY,
    "DonorID" INT NOT NULL REFERENCES "Donors"("DonorID"),
    "FileName" TEXT NOT NULL,
    "StorageKey" TEXT NOT NULL,
    "FileSize" INT,
    "MimeType" TEXT,
    "UploadedBy" INT REFERENCES "Users"("UserID"),
    "UploadedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_donors_assigned" ON "Donors"("AssignedStafferID");
CREATE INDEX IF NOT EXISTS "idx_donortasks_donor" ON "DonorTasks"("DonorID");
CREATE INDEX IF NOT EXISTS "idx_donortasks_assigned" ON "DonorTasks"("AssignedTo");
CREATE INDEX IF NOT EXISTS "idx_donorfiles_donor" ON "DonorFiles"("DonorID");
