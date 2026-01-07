
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

// Try .env.local first, then .env
if (fs.existsSync(envLocalPath)) {
    console.log('Loading .env.local');
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    console.log('Loading .env');
    dotenv.config({ path: envPath });
} else {
    console.log('No .env file found!');
}

async function runMigration() {
    console.log('Connecting with connection string length:', (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').length);

    const client = new Client({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.join(__dirname, '../database', 'crm_update.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
