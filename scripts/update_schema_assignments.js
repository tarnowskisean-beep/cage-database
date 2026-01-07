const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Updating Schema for Assignment Rules ---');

        // 1. Add AssignedToUserID to Donations
        console.log('Adding AssignedToUserID to Donations...');
        await pool.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "AssignedToUserID" INT`);
        console.log('✓ AssignedToUserID added.');

        // 2. Create AssignmentRules Table
        console.log('Creating AssignmentRules table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "AssignmentRules" (
                "RuleID" SERIAL PRIMARY KEY,
                "Name" TEXT NOT NULL,
                "Priority" INT NOT NULL DEFAULT 0,
                "IsActive" BOOLEAN DEFAULT TRUE,
                "AssignToUserID" INT NOT NULL,
                "AmountMin" DECIMAL(10, 2),
                "AmountMax" DECIMAL(10, 2),
                "State" TEXT,
                "ZipPrefix" TEXT,
                "CampaignID" TEXT,
                "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('✓ AssignmentRules table created.');

        console.log('\n--- Verification ---');
        const donationCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Donations' AND column_name = 'AssignedToUserID'`);
        console.log('Donations.AssignedToUserID:', donationCols.rows.length > 0 ? 'Exists' : 'MISSING');

        const rulesTable = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'AssignmentRules'`);
        console.log('AssignmentRules Table:', rulesTable.rows.length > 0 ? 'Exists' : 'MISSING');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();
