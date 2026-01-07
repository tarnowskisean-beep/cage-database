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

        // Check column type and constraints for EntryMode
        const res = await client.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'Batches' AND column_name = 'EntryMode';
        `);

        console.log("Column Definition:", res.rows);

        // Check for any check constraints
        const constraints = await client.query(`
            SELECT con.conname, pg_get_constraintdef(con.oid)
            FROM pg_catalog.pg_constraint con
            INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
            WHERE rel.relname = 'Batches';
        `);

        console.log("Constraints:", constraints.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
