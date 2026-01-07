
import { query } from '@/lib/db';

async function migrate() {
    try {
        console.log('Adding CagingID to Donors table...');

        await query(`
            ALTER TABLE "Donors" 
            ADD COLUMN IF NOT EXISTS "CagingID" TEXT;
        `);

        await query(`CREATE INDEX IF NOT EXISTS idx_donors_cagingid ON "Donors" ("CagingID");`);

        console.log('Donors table updated successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
