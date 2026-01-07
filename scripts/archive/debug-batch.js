const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        console.log("Searching for Batch AG.08...");

        // 1. Check Batch
        const batchRes = await pool.query(`
            SELECT * FROM "Batches" WHERE "BatchCode" = 'AG.08'
        `);

        if (batchRes.rows.length === 0) {
            console.log("❌ Batch AG.08 NOT FOUND");
            return;
        }

        const batch = batchRes.rows[0];
        console.log("✅ Batch Found:", batch);
        console.log("Batch Status:", `"${batch.Status}"`); // Check for spaces
        console.log("Batch ClientID:", batch.ClientID);

        // 2. Check Client
        const clientRes = await pool.query(`
            SELECT * FROM "Clients" WHERE "ClientID" = $1
        `, [batch.ClientID]);
        const client = clientRes.rows[0];
        console.log("✅ Client Found:", client);

        // 3. Check Donations
        const donationsRes = await pool.query(`
            SELECT count(*), min("GiftDate"), max("GiftDate"), "ClientID" 
            FROM "Donations" 
            WHERE "BatchID" = $1
            GROUP BY "ClientID"
        `, [batch.BatchID]);

        console.log("✅ Donations Info:", donationsRes.rows);

        // 4. Check if Search Query would find it
        // Simulating the search query conditions
        console.log("\n--- Simulating Search ---");
        const sql = `
            SELECT count(*) 
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE c."ClientCode" = $1 AND b."Status" IN ('Closed', 'Reconciled')
        `;
        const searchRes = await pool.query(sql, [client.ClientCode]);
        console.log(`Matching records for Client ${client.ClientCode} and Status Closed:`, searchRes.rows[0].count);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debug();
