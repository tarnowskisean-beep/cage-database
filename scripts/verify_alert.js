
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cage_db';

async function verify() {
    const client = new Client({ connectionString: DATABASE_URL });
    try {
        await client.connect();

        // 1. Find or Create a Test Donor
        const donorRes = await client.query(`
            INSERT INTO "Donors" ("FirstName", "LastName", "AlertMessage", "HasAlert", "CagingID")
            VALUES ('Test', 'AlertDonor', 'This is a test alert', true, 'TEST_ALERT_123')
            ON CONFLICT ("DonorID") DO NOTHING
            RETURNING "DonorID";
        `);

        // If not returned (existed), find it
        let donorId;
        if (donorRes.rows.length > 0) {
            donorId = donorRes.rows[0].DonorID;
        } else {
            const exist = await client.query(`SELECT "DonorID" FROM "Donors" WHERE "CagingID" = 'TEST_ALERT_123' LIMIT 1`);
            donorId = exist.rows[0].DonorID;
        }

        console.log(`Testing with DonorID: ${donorId}`);

        // 2. Simulate API Lookup Query
        const lookupRes = await client.query(`
            SELECT "DonorID", "FirstName", "LastName", "AlertMessage", "HasAlert", "CagingID"
            FROM "Donors" 
            WHERE "CagingID" = $1 OR "DonorID"::text = $1
            LIMIT 1
        `, ['TEST_ALERT_123']);

        const record = lookupRes.rows[0];
        console.log('Lookup Result:', record);

        if (record.HasAlert === true && record.AlertMessage === 'This is a test alert') {
            console.log('✅ VERIFICATION SUCCESS: Alert data returned correctly.');
        } else {
            console.error('❌ VERIFICATION FAILED: Alert data missing or incorrect.');
            process.exit(1);
        }

        // Cleanup
        await client.query(`DELETE FROM "Donors" WHERE "DonorID" = $1`, [donorId]);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

verify();
