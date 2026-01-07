const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function checkMailCodes() {
    try {
        console.log("Checking MailCodes for Batch AG.08...");

        const res = await pool.query(`
            SELECT d."DonationID", d."MailCode", d."GiftAmount"
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            WHERE b."BatchCode" = 'AG.08'
            LIMIT 5
        `);

        console.log("Sample Donations:", res.rows);

        if (res.rows.length > 0 && !res.rows[0].MailCode) {
            console.log("⚠️ MailCode is MISSING (null or empty)!");
        } else {
            console.log("✅ MailCode exists.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkMailCodes();
