const { Client } = require('pg');
require('dotenv').config();

async function checkDonations() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query(`
      SELECT "DonationID", "GiftAmount", "DonorFirstName", "DonorLastName", "DonorAddress", "OrganizationName"
      FROM "Donations"
      ORDER BY "CreatedAt" DESC
      LIMIT 5
    `);

        console.log('Latest 5 Donations:');
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkDonations();
