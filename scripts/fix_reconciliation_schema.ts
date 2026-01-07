
import { query } from '../lib/db';

async function migrate() {
    try {
        console.log('🔧 Fixing ReconciliationBankTransactions Schema...');

        // Add MatchedBatchID
        await query(`
            ALTER TABLE "ReconciliationBankTransactions" 
            ADD COLUMN IF NOT EXISTS "MatchedBatchID" INT REFERENCES "Batches"("BatchID");
        `);

        // Add MatchedDonationID
        await query(`
            ALTER TABLE "ReconciliationBankTransactions" 
            ADD COLUMN IF NOT EXISTS "MatchedDonationID" INT REFERENCES "Donations"("DonationID");
        `);

        // Add Status
        await query(`
            ALTER TABLE "ReconciliationBankTransactions" 
            ADD COLUMN IF NOT EXISTS "Status" TEXT DEFAULT 'Unmatched';
        `);

        console.log('✅ Schema Updated Successfully.');
    } catch (e) {
        console.error('Migration Error:', e);
    }
}

migrate();
