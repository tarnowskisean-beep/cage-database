const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Fixing Users Table ---');
        await pool.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ReceiveFlaggedAlerts" BOOLEAN DEFAULT FALSE`);
        console.log('Success! ReceiveFlaggedAlerts added or exists.');

        console.log('\n--- Inspecting Donations Table ---');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Donations'
            ORDER BY column_name;
        `);
        console.log('Donations Columns:', res.rows.map(r => r.column_name).join(', '));

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();
