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
      ADD COLUMN IF NOT EXISTS "DefaultGiftYear" INT,
      ADD COLUMN IF NOT EXISTS "DefaultGiftQuarter" TEXT;
      
      ALTER TABLE "Donations"
      ADD COLUMN IF NOT EXISTS "GiftYear" INT,
      ADD COLUMN IF NOT EXISTS "GiftQuarter" TEXT;
    `);

        console.log('Successfully added DefaultGiftYear and DefaultGiftQuarter to Batches and Donations.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
