const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use provided connection string or env
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function migrate() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🛠️  Migrating Export Templates Schema...");

        await client.query(`
            CREATE TABLE IF NOT EXISTS "export_templates" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(100) NOT NULL,
                "mappings" JSONB NOT NULL,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("✅ Table 'export_templates' created/verified.");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    } finally {
        await client.end();
    }
}

migrate();
