
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const client = await pool.connect();
        console.log('Migrating BatchDocuments constraint...');

        // 1. Drop existing constraint
        // We try standard names. If it fails, user might need to check DB.
        // Usually: "BatchDocuments_DocumentType_check"
        try {
            await client.query('ALTER TABLE "BatchDocuments" DROP CONSTRAINT IF EXISTS "BatchDocuments_DocumentType_check"');
        } catch (e) {
            console.warn('Could not drop constraint, maybe it does not exist or has different name.', e.message);
        }

        // 2. Add new constraint
        await client.query(`
            ALTER TABLE "BatchDocuments" 
            ADD CONSTRAINT "BatchDocuments_DocumentType_check" 
            CHECK ("DocumentType" IN ('ReplySlipsPDF', 'ChecksPDF', 'DepositSlip', 'CheckFront', 'CheckBack'))
        `);

        console.log('Constraint updated successfully.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

run();
