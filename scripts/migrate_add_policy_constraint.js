
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting...');
        const client = await pool.connect();

        console.log('Adding UNIQUE constraint to PolicyAcceptances...');
        // We need to make sure we don't fail if duplicate data exists (cleanup first just in case)
        // Check for duplicates
        await client.query(`
            DELETE FROM "PolicyAcceptances" a 
            USING "PolicyAcceptances" b 
            WHERE a."AcceptanceID" < b."AcceptanceID" 
            AND a."UserID" = b."UserID" 
            AND a."PolicyID" = b."PolicyID";
        `);

        await client.query(`
            ALTER TABLE "PolicyAcceptances" 
            ADD CONSTRAINT "PolicyAcceptances_UserID_PolicyID_key" UNIQUE ("UserID", "PolicyID");
        `);

        console.log('Done.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
