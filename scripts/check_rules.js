const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function checkRules() {
    const connectionString = process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        const res = await client.query('SELECT count(*) FROM "mapping_rules"');
        console.log('Rule Count:', res.rows[0].count);

        const rows = await client.query('SELECT * FROM "mapping_rules" LIMIT 5');
        console.log('Sample Rules:', rows.rows);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkRules();
