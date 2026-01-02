const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        const client = await pool.connect();
        console.log('Connected to database...');

        // Add columns if they don't exist
        await client.query(`
      ALTER TABLE "Batches" 
      ADD COLUMN IF NOT EXISTS "DefaultGiftMethod" TEXT DEFAULT 'Check',
      ADD COLUMN IF NOT EXISTS "DefaultGiftPlatform" TEXT DEFAULT 'Cage',
      ADD COLUMN IF NOT EXISTS "DefaultTransactionType" TEXT DEFAULT 'Donation';
    `);

        console.log('Successfully added default columns to Batches table.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
