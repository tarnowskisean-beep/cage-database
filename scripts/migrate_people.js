
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cage_db';

async function migrate() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log("✅ DB Connected.");

        // 1. Enable pg_trgm for fuzzy matching (if not already)
        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        console.log("✅ Extension pg_trgm enabled.");

        // 2. Create Donors Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Donors" (
                "DonorID" SERIAL PRIMARY KEY,
                "FirstName" TEXT,
                "LastName" TEXT,
                "Email" TEXT,
                "Phone" TEXT,
                "Address" TEXT,
                "City" TEXT,
                "State" TEXT,
                "Zip" TEXT,
                "CreatedAt" TIMESTAMP DEFAULT NOW(),
                "UpdatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Table Created: Donors");

        // 3. Add Indices for Resolution Speed
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_email ON "Donors" ("Email");`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_name ON "Donors" ("LastName", "FirstName");`);

        // 4. Add DonorID to Donations
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Donations' AND column_name='DonorID') THEN
                    ALTER TABLE "Donations" ADD COLUMN "DonorID" INTEGER REFERENCES "Donors"("DonorID");
                    CREATE INDEX idx_donations_donorid ON "Donations" ("DonorID");
                END IF;
            END
            $$;
        `);
        console.log("✅ Table Updated: Donations (Added DonorID)");

        console.log("✨ PEOPLE MODULE SCHEMA APPLIED SUCCESSFULLY.");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    } finally {
        await client.end();
    }
}

migrate();
