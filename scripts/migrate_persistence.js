
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🛠️  Applying Reconciliation Persistence Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Add Cleared to ReconciliationBatchDetails
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReconciliationBatchDetails' AND column_name='Cleared') THEN
                    ALTER TABLE "ReconciliationBatchDetails" ADD COLUMN "Cleared" BOOLEAN DEFAULT FALSE;
                END IF;
            END
            $$;
        `);
        console.log("✅ Updated Table: ReconciliationBatchDetails (+Cleared)");

        // 2. Add Cleared to ReconciliationBankTransactions
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReconciliationBankTransactions' AND column_name='Cleared') THEN
                    ALTER TABLE "ReconciliationBankTransactions" ADD COLUMN "Cleared" BOOLEAN DEFAULT FALSE;
                END IF;
            END
            $$;
        `);
        console.log("✅ Updated Table: ReconciliationBankTransactions (+Cleared)");


        console.log("✨ PERSISTENCE SCHEMA APPLIED SUCCESSFULLY.");

    } catch (e) {
        console.error("❌ Error applying schema:", e);
    } finally {
        await client.end();
    }
}

run();
