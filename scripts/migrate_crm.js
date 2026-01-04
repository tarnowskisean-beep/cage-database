
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function migrate() {
    console.log("🛠️  Applying CRM Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS "DonorNotes" (
                "NoteID" SERIAL PRIMARY KEY,
                "DonorID" INT NOT NULL REFERENCES "Donors"("DonorID") ON DELETE CASCADE,
                "AuthorName" TEXT, 
                "Content" TEXT NOT NULL,
                "CreatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add index for performance
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_donornotes_donorid" ON "DonorNotes"("DonorID");`);

        console.log('✅ CRM Schema Applied (DonorNotes table created).');
    } catch (e) {
        console.error('❌ Migration Failed:', e);
    } finally {
        await client.end();
    }
}

migrate();
