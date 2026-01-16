const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try loading .env.local, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Updating BatchDocuments constraint...');

        // 1. Drop existing check constraint if it exists (need to know name, usually BatchDocuments_DocumentType_check)
        // We can try to DROP CONSTRAINT IF EXISTS
        await pool.query(`
            ALTER TABLE "BatchDocuments" 
            DROP CONSTRAINT IF EXISTS "BatchDocuments_DocumentType_check";
        `);

        // 2. Add new constraint including 'CheckImage'
        await pool.query(`
            ALTER TABLE "BatchDocuments" 
            ADD CONSTRAINT "BatchDocuments_DocumentType_check" 
            CHECK ("DocumentType" IN ('ReplySlipsPDF', 'ChecksPDF', 'DepositSlip', 'RelatedDocuments', 'CheckImage'));
        `);

        console.log('Migration successful: Check Constraint updated.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
