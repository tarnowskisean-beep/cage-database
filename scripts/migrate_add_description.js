require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    await client.connect();

    // Check if column exists
    const check = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Batches' AND column_name = 'Description';
    `);

    if (check.rows.length === 0) {
        console.log('Adding Description column to Batches table...');
        await client.query('ALTER TABLE "Batches" ADD COLUMN "Description" TEXT;');
        console.log('Column added successfully.');
    } else {
        console.log('Description column already exists.');
    }

    await client.end();
}

run().catch(e => console.error(e));
