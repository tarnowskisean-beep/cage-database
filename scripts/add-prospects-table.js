const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        const client = await pool.connect();
        console.log('Connected to database...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS "Prospects" (
                "ProspectID" SERIAL PRIMARY KEY,
                "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
                "CagingID" TEXT NOT NULL, 
                "MailerID" TEXT,
                "MailCode" TEXT,
                "Prefix" TEXT,
                "FirstName" TEXT,
                "MiddleName" TEXT,
                "LastName" TEXT,
                "Suffix" TEXT,
                "Address" TEXT,
                "City" TEXT,
                "State" TEXT,
                "Zip" TEXT,
                "ImportedAt" TIMESTAMPTZ DEFAULT NOW(),
                
                UNIQUE("ClientID", "CagingID")
            );
        `);

        console.log('Successfully created Prospects table.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
