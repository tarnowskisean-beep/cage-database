const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query('SELECT * FROM "Users" WHERE "UserID" = 1');
        console.log('User 1:', res.rows[0] || 'NOT FOUND');

        const batchCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Batches';
        `);
        console.log('Batches Columns:', batchCols.rows.map(r => r.column_name).join(', '));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
