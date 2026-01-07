
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkPassword() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT "PasswordHash" FROM "Users" WHERE "Email" = $1', ['alyssa@compass.com']);

        if (res.rows.length === 0) {
            console.log("User not found!");
            return;
        }

        const hash = res.rows[0].PasswordHash;
        console.log("Hash found:", hash);

        const isMatch = await bcrypt.compare('password', hash);
        console.log("Does 'password' match?", isMatch);

        // Try generating a new hash to see if it differs significantly (salt differs, but verify should work)
        const newHash = await bcrypt.hash('password', 10);
        console.log("New hash for 'password':", newHash);
        const isNewMatch = await bcrypt.compare('password', newHash);
        console.log("Does 'password' match new hash?", isNewMatch);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkPassword();
