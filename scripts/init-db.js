/* eslint-disable */
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    user: 'sa',
    password: 'CompassCaging123!',
    server: 'localhost',
    database: 'master',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function initDb() {
    try {
        console.log('Connecting to SQL Server...');
        const pool = await sql.connect(config);
        console.log('Connected!');

        const schemaPath = path.join(__dirname, '../database/setup_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by GO to execute batches
        const batches = schema.split(/^GO\s*$/m);

        for (const batch of batches) {
            const sql = batch.trim();
            if (sql) {
                console.log('Executing batch...');
                await pool.request().query(sql);
            }
        }

        console.log('Database initialization complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

initDb();
