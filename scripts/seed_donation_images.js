
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

        console.log('Finding a recent donation...');
        const res = await client.query('SELECT "DonationID" FROM "Donations" ORDER BY "DonationID" DESC LIMIT 1');

        if (res.rows.length === 0) {
            console.log('No donations found. Create one first.');
            return;
        }

        const donationID = res.rows[0].DonationID;
        console.log(`Seeding image for DonationID: ${donationID}`);

        await client.query(`
            INSERT INTO "DonationImages" ("DonationID", "StorageKey", "Type", "PageNumber")
            VALUES 
            ($1, 'https://placehold.co/600x400/png?text=Front+Check', 'CheckFront', 1),
            ($1, 'https://placehold.co/600x400/png?text=Back+Check', 'CheckBack', 2)
        `, [donationID]);

        console.log('Done.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
