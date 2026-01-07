
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Cleaning up invalid Pending resolutions...');

        // Find them first
        const check = await pool.query(`
            SELECT "DonationID", "GiftAmount", "DonorFirstName" 
            FROM "Donations" 
            WHERE "ResolutionStatus" = 'Pending' 
            AND "DonorFirstName" IS NULL 
            AND "DonorLastName" IS NULL
        `);

        console.log(`Found ${check.rowCount} records to clean.`);
        check.rows.forEach(r => console.log(`- ID ${r.DonationID}: $${r.GiftAmount}`));

        if (check.rowCount > 0) {
            await pool.query(`
                UPDATE "Donations" 
                SET "ResolutionStatus" = 'Resolved' 
                WHERE "ResolutionStatus" = 'Pending'
                AND "DonorFirstName" IS NULL 
                AND "DonorLastName" IS NULL
            `);
            console.log('Successfully reset records to Resolved.');
        }

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();
