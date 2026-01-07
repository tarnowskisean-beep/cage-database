require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();

    // Check Batches columns
    const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Batches';
    `);

    console.log('Columns in Batches table:', res.rows.map(r => r.column_name));

    // Check recent Batches
    const batches = await client.query('SELECT * FROM "Batches" ORDER BY "Date" DESC LIMIT 5');
    console.log('Recent Batches:', batches.rows);

    await client.end();
}

run().catch(e => console.error(e));
