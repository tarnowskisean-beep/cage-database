require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();

    // Check ReconciliationPeriods
    console.log('--- ReconciliationPeriods ---');
    const periods = await client.query('SELECT * FROM "ReconciliationPeriods"');
    if (periods.rows.length === 0) {
        console.log('No Reconciliation Periods found.');
    } else {
        console.table(periods.rows);
    }

    // Check Donations seeded
    console.log('\n--- Recent Donations (Fees/Refunds) ---');
    const donations = await client.query(`
        SELECT "DonationID", "GiftDate", "GiftAmount", "GiftFee", "TransactionType", "GiftPlatform" 
        FROM "Donations" 
        WHERE "GiftFee" > 0 OR "TransactionType" IN ('Refund', 'Chargeback')
        ORDER BY "GiftDate" DESC LIMIT 5
    `);
    console.table(donations.rows);

    await client.end();
}

run().catch(e => console.error(e));
