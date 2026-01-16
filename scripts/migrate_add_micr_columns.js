
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();

        console.log('Adding MICR columns to Donations table...');

        const columns = [
            'ADD COLUMN IF NOT EXISTS "RoutingNumber" TEXT',
            'ADD COLUMN IF NOT EXISTS "AccountNumber" TEXT',
            'ADD COLUMN IF NOT EXISTS "CheckSequenceNumber" TEXT',
            'ADD COLUMN IF NOT EXISTS "AuxOnUs" TEXT',
            'ADD COLUMN IF NOT EXISTS "EPC" TEXT'
        ];

        for (const col of columns) {
            await client.query(`ALTER TABLE "Donations" ${col};`);
        }

        console.log('Done.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
