
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkData() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Jan 2026 Data ---');
        const res = await client.query(`
            SELECT MIN("GiftDate"), MAX("GiftDate"), COUNT(*), SUM("GiftAmount")
            FROM "Donations"
            WHERE "GiftDate" >= '2026-01-01'
        `);
        console.log('Jan 2026 Summary:', res.rows[0]);

        console.log('\n--- Checking Platforms/Methods for Jan 2026 ---');
        const platforms = await client.query(`
            SELECT "GiftPlatform", COUNT(*) 
            FROM "Donations" 
            WHERE "GiftDate" >= '2026-01-01'
            GROUP BY "GiftPlatform"
        `);
        console.table(platforms.rows);

        console.log('\n--- Checking NULL Platforms (All Time) ---');
        const nulls = await client.query(`
            SELECT COUNT(*) 
            FROM "Donations" 
            WHERE "GiftPlatform" IS NULL OR "GiftPlatform" = ''
        `);
        console.log('Null Platforms Count:', nulls.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkData();
