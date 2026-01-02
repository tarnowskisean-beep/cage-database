const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        const client = await pool.connect();
        console.log('Connected to database...');

        // Add columns if they don't exist
        await client.query(`
      ALTER TABLE "Batches" 
      ADD COLUMN IF NOT EXISTS "DefaultGiftType" TEXT;
      
      ALTER TABLE "Donations"
      ADD COLUMN IF NOT EXISTS "GiftType" TEXT;
    `);

        console.log('Successfully added DefaultGiftType to Batches and GiftType to Donations.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
