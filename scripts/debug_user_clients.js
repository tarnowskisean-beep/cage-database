
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkUserClients() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT * FROM "UserClients" WHERE "UserID" = $1', [1]);
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkUserClients();
