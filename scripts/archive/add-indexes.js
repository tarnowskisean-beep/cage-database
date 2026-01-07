const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Applying indexes...');

        await client.query('CREATE INDEX IF NOT EXISTS "idx_donations_batchid" ON "Donations" ("BatchID");');
        await client.query('CREATE INDEX IF NOT EXISTS "idx_donations_clientid" ON "Donations" ("ClientID");');
        await client.query('CREATE INDEX IF NOT EXISTS "idx_batches_clientid" ON "Batches" ("ClientID");');
        await client.query('CREATE INDEX IF NOT EXISTS "idx_donations_date" ON "Donations" ("GiftDate");');

        console.log('Indexes applied successfully.');
    } catch (e) {
        console.error('Error applying indexes:', e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
