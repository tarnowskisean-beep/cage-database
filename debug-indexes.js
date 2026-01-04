
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function listIndexes() {
    try {
        console.log('Connecting to DB...');
        const res = await pool.query(`
      SELECT 
        tablename, 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);

        console.log('Existing Indexes:');
        res.rows.forEach(row => {
            console.log(`[${row.tablename}] ${row.indexname}: ${row.indexdef}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listIndexes();
