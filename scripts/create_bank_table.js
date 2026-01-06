
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function createTable() {
    const client = await pool.connect();
    try {
        console.log('Creating ReconciliationBankTransactions table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS "ReconciliationBankTransactions" (
                "TransactionID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "ReconciliationPeriodID" UUID NOT NULL REFERENCES "ReconciliationPeriods"("ReconciliationPeriodID"),
                "Date" DATE NOT NULL,
                "Amount" DECIMAL(10, 2) NOT NULL,
                "Description" TEXT,
                "Reference" TEXT,
                "MatchedBatchID" INTEGER REFERENCES "Batches"("BatchID"),
                "MatchedDonationID" INTEGER REFERENCES "Donations"("DonationID"),
                "Status" TEXT DEFAULT 'Unmatched',
                "CreatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Table created successfully.');

        // Add index for performance
        console.log('Adding index...');
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_bank_recon_period" ON "ReconciliationBankTransactions" ("ReconciliationPeriodID");`);

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createTable();
