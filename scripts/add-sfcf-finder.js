require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres";

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // 1. Get SFCF client
        const res = await client.query('SELECT "ClientID" FROM "Clients" WHERE "ClientCode" = $1', ['SFCF']);
        if (res.rows.length === 0) {
            console.error("Client SFCF not found.");
            process.exit(1);
        }
        const clientId = res.rows[0].ClientID;

        // 2. Insert Prospect
        const insertQuery = `
            INSERT INTO "Prospects" 
            ("ClientID", "CagingID", "FirstName", "LastName", "Address", "City", "State", "Zip", "MailerID")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT ("ClientID", "CagingID") 
            DO UPDATE SET "FirstName" = EXCLUDED."FirstName";
        `;

        await client.query(insertQuery, [
            clientId,
            '12345',
            'Random',
            'Finder',
            '123 Finder Lane',
            'Cage City',
            'CA',
            '90210',
            'FINDER-123'
        ]);

        console.log(`✅ Added Finder Record (CagingID: 12345) for SFCF (ClientID: ${clientId})`);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
