
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkClients() {
    try {
        console.log('Connecting to DB...');
        const res = await pool.query('SELECT COUNT(*) FROM "Clients"');
        console.log('Client Count:', res.rows[0].count);

        if (res.rows[0].count > 0) {
            const rows = await pool.query('SELECT "ClientCode", "ClientName" FROM "Clients" LIMIT 5');
            console.log('First 5 Clients:', rows.rows);
        }
    } catch (err) {
        console.error('DB Error:', err);
    } finally {
        await pool.end();
    }
}

checkClients();
