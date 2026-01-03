const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
// Load .env first, then override with .env.local
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function applySchema() {
    const connectionString = process.env.POSTGRES_URL ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

    console.log('Connecting to PostgreSQL...');

    // Log masked connection string for debugging
    const masked = connectionString.replace(/:[^:@]+@/, ':****@');
    console.log('Using connection:', masked);

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('Connected!');

        const schemaPath = path.join(__dirname, '../database/schema_import.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await client.query(schema);

        console.log('Schema applied successfully!');
        client.release();
    } catch (err) {
        console.error('Error applying schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applySchema();
