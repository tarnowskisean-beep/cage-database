
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const PLATFORMS = ['Anedot', 'Chainbridge', 'WinRed', 'Stripe', 'ActBlue'];
const METHODS = ['Check', 'Credit Card', 'EFT', 'In-Kind', 'Wire'];

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedHighVolume() {
    const client = await pool.connect();
    try {
        console.log('🚀 Seeding HIGH VOLUME Demo Data for Jan 2026...');

        // 1. Get IDs
        const clientRes = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        const clientID = clientRes.rows[0].ClientID;

        const donorRes = await client.query('SELECT "DonorID" FROM "Donors" LIMIT 1');
        const donorID = donorRes.rows[0].DonorID;

        const batchRes = await client.query('SELECT "BatchID" FROM "Batches" WHERE "ClientID" = $1 LIMIT 1', [clientID]);
        const batchID = batchRes.rows[0].BatchID;

        // Target: Jan 1 - Jan 5, 2026
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-05'); // Keep it tight to start of month

        // Strategy: Mix of small and MASSIVE transactions to hit ~$50M total
        const batches = [
            { count: 500, min: 10, max: 100, label: 'Small Donors' },       // ~$27k
            { count: 200, min: 500, max: 2500, label: 'Mid Donors' },       // ~$300k
            { count: 50, min: 5000, max: 25000, label: 'Major Donors' },    // ~$750k
            { count: 10, min: 100000, max: 500000, label: 'PACs' },         // ~$3M
            { count: 5, min: 5000000, max: 10000000, label: 'Super PACs' }  // ~$40M
        ];

        let totalAdded = 0;

        for (const batch of batches) {
            console.log(`   Processing ${batch.label}...`);
            for (let i = 0; i < batch.count; i++) {
                const platform = randomElement(PLATFORMS);
                // Large gifts usually Wire/EFT
                const method = batch.min > 10000 ? (Math.random() > 0.5 ? 'Wire' : 'Check') : randomElement(METHODS);

                const amount = Math.floor(Math.random() * (batch.max - batch.min + 1)) + batch.min;
                const fee = amount * 0.01; // Lower fee for large acts
                const date = randomDate(startDate, endDate);

                await client.query(`
                    INSERT INTO "Donations" 
                    ("ClientID", "DonorID", "BatchID", "GiftDate", "GiftAmount", "GiftFee", "GiftMethod", "GiftPlatform", "TransactionType", "CreatedBy", "CreatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Donation', 1, NOW())
                `, [clientID, donorID, batchID, date, amount.toFixed(2), fee.toFixed(2), method, platform]);

                totalAdded += amount;
            }
        }

        console.log(`✅ Seeding Complete! Added ~$${(totalAdded / 1000000).toFixed(2)}M in revenue.`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedHighVolume();
