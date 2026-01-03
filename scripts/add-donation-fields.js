const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Adding comprehensive fields to Donations table...');

        await client.query('BEGIN');

        // Add Donor Demographic Fields
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorPrefix" VARCHAR(20)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorFirstName" VARCHAR(100)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorMiddleName" VARCHAR(100)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorLastName" VARCHAR(100)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorSuffix" VARCHAR(20)`);

        // Add Donor Contact/Employment Fields
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorAddress" VARCHAR(255)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorCity" VARCHAR(100)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorState" VARCHAR(50)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorZip" VARCHAR(20)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorEmployer" VARCHAR(255)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorOccupation" VARCHAR(255)`);

        // Add Transaction Details
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "GiftPledgeAmount" DECIMAL(12, 2) DEFAULT 0`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "GiftFee" DECIMAL(12, 2) DEFAULT 0`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "GiftCustodian" VARCHAR(255)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "GiftConduit" VARCHAR(255)`);

        // Add Metadata
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "PostMarkYear" INT`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "PostMarkQuarter" VARCHAR(10)`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "IsInactive" BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "Comment" TEXT`);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
