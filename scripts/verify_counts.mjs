
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const db = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function main() {
    try {
        await db.connect();
        console.log('--- Database Counts ---');

        const tables = ['Donors', 'Batches', 'Donations', 'DonorTasks', 'Pledges'];
        for (const t of tables) {
            const res = await db.query(`SELECT COUNT(*) FROM "${t}"`);
            console.log(`${t}: ${res.rows[0].count}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

main();
