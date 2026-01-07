
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Flagging random donations for demo alerts...');

        // Select 3 random donations that are NOT pending resolution
        const res = await pool.query(`
            UPDATE "Donations" 
            SET "IsFlagged" = TRUE 
            WHERE "DonationID" IN (
                SELECT "DonationID" FROM "Donations" 
                WHERE "ResolutionStatus" != 'Pending' 
                ORDER BY RANDOM() 
                LIMIT 3
            )
            RETURNING "DonationID", "GiftAmount", "DonorFirstName", "DonorLastName";
        `);

        console.log(`Successfully flagged ${res.rowCount} donations:`);
        res.rows.forEach(r => console.log(`- ${r.DonorFirstName} ${r.DonorLastName} ($${r.GiftAmount})`));

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        pool.end();
    }
}

run();
