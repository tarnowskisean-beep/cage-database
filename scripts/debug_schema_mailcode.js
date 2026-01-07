
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkCols() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Donations';
        `);
        console.log("Donations Columns:", res.rows.map(r => r.column_name).sort().join(', '));
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkCols();
