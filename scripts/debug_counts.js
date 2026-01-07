
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkCounts() {
    try {
        const client = await pool.connect();
        const tables = ['Donations', 'Batches', 'Donors', 'Users', 'Clients', 'AuditLogs', 'ReconciliationPeriods'];
        for (const t of tables) {
            const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
            console.log(`${t}: ${res.rows[0].count}`);
        }
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkCounts();
