
import { query } from '@/lib/db';

async function migrate() {
    try {
        console.log('Starting Migration...');

        // 1. Add ResolutionStatus to Donations
        await query(`
            ALTER TABLE "Donations" 
            ADD COLUMN IF NOT EXISTS "ResolutionStatus" TEXT DEFAULT 'Resolved' 
            CHECK ("ResolutionStatus" IN ('Resolved', 'Pending'));
        `);
        console.log('Added ResolutionStatus to Donations.');

        // 2. Create DonationResolutionCandidates
        await query(`
            CREATE TABLE IF NOT EXISTS "DonationResolutionCandidates" (
                "CandidateID" SERIAL PRIMARY KEY,
                "DonationID" INT NOT NULL REFERENCES "Donations"("DonationID"),
                "DonorID" INT NOT NULL REFERENCES "Donors"("DonorID"),
                "Score" DECIMAL(5, 4),
                "Reason" TEXT,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Created DonationResolutionCandidates table.');

        console.log('Migration Complete.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
