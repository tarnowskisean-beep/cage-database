const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Flagging Donations for Demo ---');

        // 1. Clear existing pending? Maybe not, just add more.

        // 2. Select 5 random donations that are NOT already pending
        const res = await pool.query(`
            SELECT "DonationID", "GiftAmount", "DonorFirstName", "DonorLastName"
            FROM "Donations"
            WHERE "ResolutionStatus" != 'Pending'
            ORDER BY RANDOM()
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log('No donations found to flag.');
            return;
        }

        const ids = res.rows.map(r => r.DonationID);
        console.log(`Flagging IDs: ${ids.join(', ')}`);

        // 3. Update them
        await pool.query(`
            UPDATE "Donations"
            SET "ResolutionStatus" = 'Pending'
            WHERE "DonationID" = ANY($1)
        `, [ids]);

        console.log('Successfully flagged 5 donations for Client Review.');
        res.rows.forEach(r => {
            console.log(`- Donation #${r.DonationID}: $${r.GiftAmount} (${r.DonorFirstName} ${r.DonorLastName})`);
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();
