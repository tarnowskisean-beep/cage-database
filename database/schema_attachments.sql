-- Support for Batch Attachments (via Import Sessions for now)

-- 1. Store the original CSV content in the session
ALTER TABLE "import_sessions" ADD COLUMN IF NOT EXISTS "file_content" TEXT;

-- 2. Link Batches to Import Sessions
ALTER TABLE "Batches" ADD COLUMN IF NOT EXISTS "ImportSessionID" INT REFERENCES "import_sessions"("id") ON DELETE SET NULL;
