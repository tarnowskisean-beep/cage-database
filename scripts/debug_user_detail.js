
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkUserDetail() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT "UserID", "Username", "Email", "TwoFactorEnabled" FROM "Users" WHERE "Email" = $1', ['alyssa@compass.com']);
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkUserDetail();
