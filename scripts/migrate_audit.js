const { Client } = require('pg');

// Hardcoded connection string from working migrate_crm.js
const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function migrate() {
    console.log("🛠️  Applying Audit Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Creating AuditLogs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "AuditLogs" (
                "LogID" SERIAL PRIMARY KEY,
                "Action" VARCHAR(50) NOT NULL,
                "EntityType" VARCHAR(50) NOT NULL,
                "EntityID" VARCHAR(50),
                "Actor" VARCHAR(255) NOT NULL,
                "Details" TEXT,
                "IPAddress" VARCHAR(45),
                "CreatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);

        // Index for fast querying by Actor or Date
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "AuditLogs" ("Actor");`);
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_audit_date" ON "AuditLogs" ("CreatedAt");`);

        console.log('✅ AuditLogs table created.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
