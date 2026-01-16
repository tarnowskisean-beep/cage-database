
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

        console.log('Creating Policies table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Policies" (
                "PolicyID" SERIAL PRIMARY KEY,
                "PolicyType" TEXT NOT NULL, -- e.g. TOS, Privacy
                "Version" TEXT NOT NULL,
                "Content" TEXT NOT NULL,
                "IsActive" BOOLEAN DEFAULT TRUE,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE("PolicyType", "Version")
            );
        `);

        console.log('Creating PolicyAcceptances table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "PolicyAcceptances" (
                "AcceptanceID" SERIAL PRIMARY KEY,
                "UserID" INT NOT NULL, -- Logical FK to Users
                "PolicyID" INT NOT NULL REFERENCES "Policies"("PolicyID"),
                "AcceptedAt" TIMESTAMPTZ DEFAULT NOW(),
                "IPAddress" TEXT,
                UNIQUE("UserID", "PolicyID")
            );
        `);

        // Check if we need to seed a default policy
        const res = await client.query('SELECT COUNT(*) as cnt FROM "Policies"');
        if (parseInt(res.rows[0].cnt) === 0) {
            console.log('Seeding default ToS...');
            await client.query(`
                INSERT INTO "Policies" ("PolicyType", "Version", "Content")
                VALUES ('Terms of Service', '1.0', '<p>Terms of Service Content...</p>')
            `);
        }

        console.log('Done.');
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
