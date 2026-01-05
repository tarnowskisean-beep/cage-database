
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function normalize() {
    const client = await pool.connect();
    try {
        console.log('🔄 Normalizing Platforms...');
        const res = await client.query(`
            UPDATE "Donations" 
            SET "GiftPlatform" = 'WinRed' 
            WHERE "GiftPlatform" ILIKE 'Winred' OR "GiftPlatform" ILIKE 'WinRED'
        `);
        console.log(`✅ Updated ${res.rowCount} rows.`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

normalize();
