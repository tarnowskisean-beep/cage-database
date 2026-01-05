const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL missing');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

const PLATFORMS = ['Anedot', 'Chainbridge', 'Winred', 'Stripe', 'ActBlue'];
const METHODS = ['Check', 'Credit Card', 'EFT', 'In-Kind', 'Wire'];

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding Demo Data for Jan 2026...');

        // 1. Get ClientID
        const clientRes = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        const clientID = clientRes.rows[0].ClientID;

        // 2. Get DonorID
        const donorRes = await client.query('SELECT "DonorID" FROM "Donors" LIMIT 1');
        const donorID = donorRes.rows[0].DonorID;

        // 3. Get BatchID
        const batchRes = await client.query('SELECT "BatchID" FROM "Batches" WHERE "ClientID" = $1 LIMIT 1', [clientID]);
        const batchID = batchRes.rows[0].BatchID;

        // 4. Generate 50 Transactions
        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-10');

        for (let i = 0; i < 50; i++) {
            const platform = randomElement(PLATFORMS);
            const method = randomElement(METHODS);
            const amount = (Math.random() * 500) + 10; // $10 - $510
            const fee = amount * 0.03;
            const date = randomDate(startDate, endDate);

            await client.query(`
                INSERT INTO "Donations" 
                ("ClientID", "DonorID", "BatchID", "GiftDate", "GiftAmount", "GiftFee", "GiftMethod", "GiftPlatform", "TransactionType", "CreatedBy", "CreatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Donation', 1, NOW())
            `, [clientID, donorID, batchID, date, amount.toFixed(2), fee.toFixed(2), method, platform]);
        }

        console.log('✅ Inserted 50 demo transactions.');

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
