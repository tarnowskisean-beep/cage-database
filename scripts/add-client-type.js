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

        // Add column if not exists
        await client.query(`
      ALTER TABLE "Clients" 
      ADD COLUMN IF NOT EXISTS "ClientType" TEXT;
    `);

        console.log('Successfully added ClientType to Clients.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
