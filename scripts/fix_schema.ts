
import { query } from '@/lib/db';

async function fixSchema() {
    try {
        console.log('Fixing Donation Schema...');

        await query(`
            ALTER TABLE "Donations" 
            ADD COLUMN IF NOT EXISTS "ResolutionStatus" TEXT DEFAULT 'Resolved',
            ADD COLUMN IF NOT EXISTS "ReceiptYear" INT,
            ADD COLUMN IF NOT EXISTS "ReceiptQuarter" TEXT,
            ADD COLUMN IF NOT EXISTS "IsInactive" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "GiftPlatform" TEXT,
            ADD COLUMN IF NOT EXISTS "TransactionType" TEXT,
            ADD COLUMN IF NOT EXISTS "DonorPrefix" TEXT,
            ADD COLUMN IF NOT EXISTS "GiftYear" INT,
            ADD COLUMN IF NOT EXISTS "GiftQuarter" TEXT,
            ADD COLUMN IF NOT EXISTS "CampaignID" TEXT;
        `);

        // Check constraint separately to avoid conflict if it exists
        try {
            await query(`ALTER TABLE "Donations" ADD CONSTRAINT "check_resolution_status" CHECK ("ResolutionStatus" IN ('Resolved', 'Pending'));`);
        } catch (e: any) {
            // Include explicit check for error message about existing constraint (postgres specific) or simply catch generic
            console.log('Constraint check_resolution_status might already exist, ignoring.');
        }

        console.log('Donation Schema Fixed.');
        process.exit(0);
    } catch (e) {
        console.error('Schema Fix Failed:', e);
        process.exit(1);
    }
}

fixSchema();
