require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log("🔄 Updating Batches EntryMode Constraint...");

        // 1. Drop existing constraint
        await client.query(`ALTER TABLE "Batches" DROP CONSTRAINT IF EXISTS "Batches_EntryMode_check";`);

        // 2. Add new constraint with broader allowed values
        // We include old values + new UI values + schema values to be safe
        const allowed = [
            'Barcode',
            'Datamatrix',
            'Barcode/Datamatrix',
            'Scan/Barcode',
            'Manual',
            'ZerosOCR',
            'Zeros',
            'Import',
            'Data Entry'
        ];

        const arrayStr = allowed.map(s => `'${s}'`).join(', ');

        await client.query(`
            ALTER TABLE "Batches" 
            ADD CONSTRAINT "Batches_EntryMode_check" 
            CHECK ("EntryMode" IN (${arrayStr}));
        `);

        console.log("✅ Batches_EntryMode_check constraint updated successfully!");
        console.log("Allowed values:", allowed);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
