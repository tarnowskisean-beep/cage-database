const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use provided connection string or env
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function check() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT to_regclass('public.export_templates')`);
        console.log("Table exists:", !!res.rows[0].to_regclass);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

check();
