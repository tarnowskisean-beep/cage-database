const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

async function migrate() {
    console.log('Connecting to Supabase...');
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('Connected.');

        const schemaPath = path.join(__dirname, '../database/schema_postgres.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await client.query(schema);

        console.log('Migration successful!');
        client.release();
        await pool.end();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
