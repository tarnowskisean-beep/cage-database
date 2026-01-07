
import { query } from '@/lib/db';

async function migrate() {
    try {
        console.log('Migrating Donors table for Alerts...');

        await query(`
            ALTER TABLE "Donors" 
            ADD COLUMN IF NOT EXISTS "AlertMessage" TEXT,
            ADD COLUMN IF NOT EXISTS "HasAlert" BOOLEAN DEFAULT FALSE;
        `);

        console.log('Donors table updated successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
}

migrate();
