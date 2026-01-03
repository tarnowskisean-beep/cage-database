const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        console.log("Finding most recent batch...");

        // 1. Find Latest Batch
        const batchRes = await pool.query(`
            SELECT * FROM "Batches" ORDER BY "CreatedAt" DESC LIMIT 1
        `);

        if (batchRes.rows.length === 0) {
            console.log("❌ No batches found.");
            return;
        }

        const batch = batchRes.rows[0];
        console.log("✅ Latest Batch:", batch.BatchCode, "| Status:", batch.Status, "| ID:", batch.BatchID);
        console.log("Batch CreatedAt:", batch.CreatedAt);

        // 2. Check Donations for this Batch
        const donationsRes = await pool.query(`
            SELECT "DonationID", "GiftAmount", "MailCode", "GiftDate", "CreatedAt"
            FROM "Donations" 
            WHERE "BatchID" = $1
            LIMIT 5
        `, [batch.BatchID]);

        console.log(`✅ Found ${donationsRes.rows.length} donations.`);
        if (donationsRes.rows.length > 0) {
            console.log("Sample Donation:", donationsRes.rows[0]);
        } else {
            console.log("⚠️ NO DONATIONS found for this batch!");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debug();
