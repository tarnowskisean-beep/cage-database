const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    const client = await pool.connect();
    try {
        // 1. Get a Donor
        const res = await client.query('SELECT "DonorID" FROM "Donors" LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No donors found. Cannot verify.');
            return;
        }
        const donorId = res.rows[0].DonorID;
        console.log(`Using DonorID: ${donorId}`);

        // 2. Create Pledge
        const mailCode = 'Verify-Campaign-' + Math.floor(Math.random() * 1000);
        const amount = 1000.00;
        console.log(`Creating Pledge: ${mailCode} for $${amount}`);

        await client.query(`
            INSERT INTO "Pledges" ("DonorID", "MailCode", "Amount")
            VALUES ($1, $2, $3)
        `, [donorId, mailCode, amount]);

        // 3. Create Matching Donation
        const giftAmount = 250.00;
        // Need a valid ClientID for foreign key constraint in Donations?
        // Let's check constraints. Donations references Clients(ClientID).
        const clientRes = await client.query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        const clientId = clientRes.rows[0].ClientID;

        console.log(`Creating Donation: $${giftAmount} with MailCode: ${mailCode}`);
        await client.query(`
            INSERT INTO "Donations" 
            ("ClientID", "DonorID", "TransactionType", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "MailCode")
            VALUES ($1, $2, 'Donation', $3, 'Check', 'Manual', NOW(), $4)
        `, [clientId, donorId, giftAmount, mailCode]);

        console.log('Verification data seeded.');
        console.log('Run the following command to verify API response:');
        console.log(`curl "http://localhost:3000/api/people/${donorId}"`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
