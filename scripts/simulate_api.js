require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();
    const id = 1; // Testing ID 1
    console.log(`Testing Reconciliation API logic for Period ID: ${id}`);

    try {
        // 1. Fetch Period
        console.log('1. Fetching Period...');
        const periodRes = await client.query(`
            SELECT 
                p.*,
                c."ClientName"
            FROM "ReconciliationPeriods" p
            JOIN "Clients" c ON p."ClientID" = c."ClientID"
            WHERE "ReconciliationPeriodID" = $1
        `, [id]);

        if (periodRes.rows.length === 0) {
            console.error('Period not found (0 rows)');
            return;
        }
        const period = periodRes.rows[0];
        console.log('Period found:', period.ReconciliationPeriodID, period.ClientName);

        // 2. Fetch Batches (The one I suspect)
        console.log('2. Fetching Batches...');
        const batchesRes = await client.query(`
            SELECT "BatchID", "Date", "BatchCode", "PaymentCategory", "Cleared", "EntryMode", "TotalAmount"
            FROM "Batches"
            WHERE "ClientID" = $1 
            AND "Date" >= $2 AND "Date" <= $3
            AND "Status" IN ('Closed', 'Submitted')
            ORDER BY "Date" ASC
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);
        console.log(`Batches found: ${batchesRes.rows.length}`);

        // 3. Fetch Money Out (Refunds)
        console.log('3. Fetching Refunds...');
        const refundsRes = await client.query(`
            SELECT "DonationID", "GiftDate", "GiftAmount", "TransactionType", "DonorID", "BatchID", "GiftPlatform"
            FROM "Donations"
            WHERE "ClientID" = $1
            AND "GiftDate" >= $2 AND "GiftDate" <= $3
            AND "TransactionType" IN ('Refund', 'Chargeback', 'Void')
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);
        console.log(`Refunds found: ${refundsRes.rows.length}`);

        // 4. Fetch Fees
        console.log('4. Fetching Fees...');
        const feesRes = await client.query(`
            SELECT "DonationID", "GiftDate", "GiftFee", "TransactionType", "GiftPlatform"
            FROM "Donations"
            WHERE "ClientID" = $1
            AND "GiftDate" >= $2 AND "GiftDate" <= $3
            AND "GiftFee" > 0
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);
        console.log(`Fees found: ${feesRes.rows.length}`);

        console.log('ALL QUERIES SUCCESSFUL');

    } catch (e) {
        console.error('QUERY ERROR:', e);
    } finally {
        await client.end();
    }
}

run().catch(e => console.error(e));
