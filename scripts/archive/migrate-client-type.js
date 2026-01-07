
const { Pool } = require('pg');

// Reuse working connection string
const connectionString = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding ClientType to Clients...');
        await pool.query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "ClientType" TEXT;`);
        console.log('Migration SUCCESS.');
        process.exit(0);
    } catch (err) {
        console.error('Migration FAILED:', err);
        process.exit(1);
    }
}

migrate();
