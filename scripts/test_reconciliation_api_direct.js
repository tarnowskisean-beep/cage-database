const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Get the most recently created period
        const periodRes = await client.query('SELECT * FROM "ReconciliationPeriods" ORDER BY "CreatedAt" DESC LIMIT 1');
        if (periodRes.rows.length === 0) {
            console.log("No periods found in DB.");
            return;
        }
        const recentPeriod = periodRes.rows[0];
        const id = recentPeriod.ReconciliationPeriodID;
        console.log("Most recent Period ID:", id);

        // 2. Try to fetch it using the EXACT query from the API
        const queryText = `
            SELECT 
                p.*,
                c."ClientName"
            FROM "ReconciliationPeriods" p
            JOIN "Clients" c ON p."ClientID" = c."ClientID"
            WHERE "ReconciliationPeriodID" = $1
        `;
        const res = await client.query(queryText, [id]);

        if (res.rows.length > 0) {
            console.log("✅ Success! Found period:", res.rows[0].ReconciliationPeriodID);
            const period = res.rows[0];

            // 3. Test Sub-Queries (Batches)
            console.log("Testing Batches Query...");
            try {
                const batchesRes = await client.query(`
                    SELECT "BatchID", "Date", "BatchCode", "PaymentCategory", "Cleared"
                    FROM "Batches"
                    WHERE "ClientID" = $1 
                    AND "Date" >= $2 AND "Date" <= $3
                    AND "Status" = 'Closed'
                    ORDER BY "Date" ASC
                `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);
                console.log(`✅ Batches Query Output: Found ${batchesRes.rows.length} batches`);
            } catch (err) {
                console.error("❌ Batches Query FAILED:", err.message);
            }

            // 4. Test Sub-Queries (Transactions)
            console.log("Testing Transactions Query...");
            try {
                const txnsRes = await client.query(`
                    SELECT "TransactionID", "TransactionDate", "Description", "AmountOut", "AmountIn", "Cleared"
                    FROM "ReconciliationBankTransactions"
                    WHERE "ReconciliationPeriodID" = $1
                    ORDER BY "TransactionDate" ASC
                `, [id]);
                console.log(`✅ Transactions Query Output: Found ${txnsRes.rows.length} txns`);
            } catch (err) {
                console.error("❌ Transactions Query FAILED:", err.message);
            }

        } else {
            console.error("❌ Failed to find period with ID:", id);
            // Debug: Check if ClientID exists
            const checkClient = await client.query('SELECT * FROM "Clients" WHERE "ClientID"=$1', [recentPeriod.ClientID]);
            console.log("Does Client Exist?", checkClient.rows.length > 0);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
