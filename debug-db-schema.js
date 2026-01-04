
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

// Use the same fallback as lib/db.ts to ensure we hit the same DB as the app
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
    try {
        console.log('Connecting...');

        // List all tables
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables found:', tables.rows.map(r => r.table_name));

        // If 'Clients' or similar exists, show columns
        const clientTable = tables.rows.find(t => t.table_name.toLowerCase().includes('client'));

        if (clientTable) {
            console.log(`\nColumns for ${clientTable.table_name}:`);
            const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [clientTable.table_name]);
            console.log(columns.rows);
        } else {
            console.log('No table with "client" in name found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
