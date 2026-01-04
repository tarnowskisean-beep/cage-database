
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🛠️  Applying Batches Persistence Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Add Cleared to Batches
        // NOTE: Ideally Batches should link to a ReconciliationPeriodID if they are "assigned" to one.
        // However, for now, we just want to know if they are "Cleared" (checked off).
        // The Reconciliation Period logic selects them by Date Range. 
        // So a simple boolean flag works for now. 
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Batches' AND column_name='Cleared') THEN
                    ALTER TABLE "Batches" ADD COLUMN "Cleared" BOOLEAN DEFAULT FALSE;
                END IF;
            END
            $$;
        `);
        console.log("✅ Updated Table: Batches (+Cleared)");

        console.log("✨ BATCHES SCHEMA APPLIED SUCCESSFULLY.");

    } catch (e) {
        console.error("❌ Error applying schema:", e);
    } finally {
        await client.end();
    }
}

run();
