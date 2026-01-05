const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');
        
        // 1. Add MailCode to Donations
        console.log('Adding MailCode column to Donations...');
        await client.query(`
            ALTER TABLE "Donations" 
            ADD COLUMN IF NOT EXISTS "MailCode" TEXT;
        `);

        // 2. Create Pledges Table
        console.log('Creating Pledges table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Pledges" (
                "PledgeID" SERIAL PRIMARY KEY,
                "DonorID" INT NOT NULL,
                "MailCode" TEXT NOT NULL,
                "Amount" DECIMAL(18, 2) NOT NULL,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        console.log('Migration completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
