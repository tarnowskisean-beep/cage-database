const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function applySchema() {
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('No database connection string found!');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const schemaPath = path.join(__dirname, '../database/schema_attachments.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying Attachment Schema...');
        await client.query(schemaSql);
        console.log('Schema applied successfully.');

    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await client.end();
    }
}

applySchema();
