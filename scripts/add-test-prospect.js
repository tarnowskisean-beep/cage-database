require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // 1. Get first client
        const res = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        if (res.rows.length === 0) {
            console.error("No clients found.");
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
            'Test',
            'Prostect',
            '123 Demo Lane',
            'Washington',
            'DC',
            '20001',
            'TEST-MAILER-ID'
        ]);

        console.log(`✅ Added Test Prospect (CagingID: 12345) for ClientID: ${clientId}`);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
