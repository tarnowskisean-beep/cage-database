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

        // Mock data
        const clientIdRes = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        if (clientIdRes.rows.length === 0) {
            console.log("No clients found");
            return;
        }
        const clientId = clientIdRes.rows[0].ClientID;
        const userIdRes = await client.query('SELECT "UserID" FROM "Users" LIMIT 1');
        const userId = userIdRes.rows[0].UserID;

        const startDate = '2025-01-01';
        const endDate = '2025-01-31';
        const transferDate = '2025-02-14';

        // 1. DELETE EXISTING to avoid conflict
        await client.query('DELETE FROM "ReconciliationPeriods" WHERE "ClientID"=$1 AND "PeriodStartDate"=$2', [clientId, startDate]);

        // 2. INSERT
        const res = await client.query(`
            INSERT INTO "ReconciliationPeriods" 
            ("ClientID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status", "CreatedBy")
            VALUES ($1, $2, $3, $4, 'Open', $5)
            RETURNING "ReconciliationPeriodID"
        `, [clientId, startDate, endDate, transferDate, userId]);

        console.log("INSERT Result Row:", res.rows[0]);
        console.log("Keys:", Object.keys(res.rows[0]));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
