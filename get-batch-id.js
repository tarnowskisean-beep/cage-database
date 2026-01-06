const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query('SELECT "BatchID" FROM "Batches" LIMIT 1');
        console.log("BATCHID:", res.rows[0]?.BatchID);
    } catch (e) { console.error(e); } finally { pool.end(); }
}
run();
