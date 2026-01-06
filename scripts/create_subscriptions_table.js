
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('Creating DonorSubscriptions table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS "DonorSubscriptions" (
                "SubscriptionID" SERIAL PRIMARY KEY,
                "UserID" INTEGER NOT NULL REFERENCES "Users"("UserID"),
                "DonorID" INTEGER NOT NULL REFERENCES "Donors"("DonorID"),
                "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("UserID", "DonorID")
            );
        `);
        console.log('✅ DonorSubscriptions table created successfully.');

    } catch (err) {
        console.error('❌ Failed to create table:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
