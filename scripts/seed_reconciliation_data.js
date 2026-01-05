const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set correctly.');
    console.error('Please ensure .env file exists and contains DATABASE_URL.');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    // Add SSL if remote (common for Vercel/Neon/Supabase)
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();

    try {
        console.log('🌱 Seeding Reconciliation Data...');

        // 1. Get ClientID (assuming 1 for now, or fetch first)
        const clientRes = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        if (clientRes.rows.length === 0) {
            console.error('No clients found. Please seed clients first.');
            return;
        }
        const clientID = clientRes.rows[0].ClientID;
        console.log(`Using ClientID: ${clientID}`);

        // 2. Get a DonorID
        const donorRes = await client.query('SELECT "DonorID" FROM "Donors" LIMIT 1');
        let donorID;
        if (donorRes.rows.length === 0) {
            console.log('Creating a dummy donor...');
            const newDonor = await client.query(`
        INSERT INTO "Donors" ("FirstName", "LastName", "Email")
        VALUES ('Test', 'Donor', 'test@example.com')
        RETURNING "DonorID"
      `);
            donorID = newDonor.rows[0].DonorID;
        } else {
            donorID = donorRes.rows[0].DonorID;
        }

        // 3. Get or Create a Closed Batch (so it shows up in "Deposits")
        const batchRes = await client.query(`
        SELECT "BatchID" FROM "Batches" 
        WHERE "ClientID" = $1 AND "Status" = 'Closed' 
        ORDER BY "Date" DESC LIMIT 1
    `, [clientID]);

        let batchID;
        if (batchRes.rows.length === 0) {
            console.log('Creating a closed batch...');
            const newBatch = await client.query(`
            INSERT INTO "Batches" ("ClientID", "Date", "BatchCode", "PaymentCategory", "Status", "TotalAmount", "CreatedBy")
            VALUES ($1, NOW(), 'SEED-BATCH-' + floor(random() * 1000), 'Credit Card', 'Closed', 0, 1)
            RETURNING "BatchID"
        `, [clientID]);
            batchID = newBatch.rows[0].BatchID;
        } else {
            batchID = batchRes.rows[0].BatchID;
        }

        // Dates
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // 4. Insert Donations with FEES (GiftFee > 0)
        console.log('Inserting Donations with Fees...');
        await client.query(`
      INSERT INTO "Donations" 
      ("ClientID", "DonorID", "BatchID", "GiftDate", "GiftAmount", "GiftFee", "GiftMethod", "GiftPlatform", "TransactionType", "CreatedBy", "CreatedAt")
      VALUES 
      ($1, $2, $3, $4, 100.00, 3.50, 'Credit Card', 'Stripe', 'Donation', 1, NOW()),
      ($1, $2, $3, $4, 50.00, 1.75, 'Credit Card', 'Stripe', 'Donation', 1, NOW())
    `, [clientID, donorID, batchID, new Date()]);

        // 5. Insert CHARGEBACKS / REFUNDS
        console.log('Inserting Chargebacks/Refunds...');
        await client.query(`
      INSERT INTO "Donations" 
      ("ClientID", "DonorID", "BatchID", "GiftDate", "GiftAmount", "GiftFee", "GiftMethod", "GiftPlatform", "TransactionType", "CreatedBy", "CreatedAt")
      VALUES 
      ($1, $2, $3, $4, -25.00, 0, 'Credit Card', 'Stripe', 'Refund', 1, NOW()),
      ($1, $2, $3, $5, -100.00, 15.00, 'Credit Card', 'Stripe', 'Chargeback', 1, NOW())
    `, [clientID, donorID, batchID, yesterday, twoDaysAgo]);

        console.log('✅ Seeding complete!');

    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
