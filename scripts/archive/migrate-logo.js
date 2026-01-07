
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        console.log('Adding LogoURL to Clients...');
        await pool.query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "LogoURL" TEXT;`);
        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
