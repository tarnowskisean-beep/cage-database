const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Try loading .env.local, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

console.log('Using connection string:', connectionString.replace(/:[^:]*@/, ':****@')); // Mask password

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Adding FileContent column to BatchDocuments...');
        await pool.query(`
            ALTER TABLE "BatchDocuments" 
            ADD COLUMN IF NOT EXISTS "FileContent" BYTEA;
        `);
        console.log('Migration successful: FileContent column added.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
