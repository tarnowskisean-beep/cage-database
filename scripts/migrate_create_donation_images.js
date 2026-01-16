
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

        console.log('Creating DonationImages table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS "DonationImages" (
                "ImageID" SERIAL PRIMARY KEY,
                "DonationID" INT NOT NULL REFERENCES "Donations"("DonationID"),
                "BatchDocumentID" INT REFERENCES "BatchDocuments"("BatchDocumentID"),
                "StorageKey" TEXT NOT NULL,
                "PageNumber" INT,
                "Type" TEXT, -- CheckFront, CheckBack, ReplySlip
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('Done.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
