
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cage_db';
const BATCH_SIZE = 5000;

async function resolveDonors() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log("✅ DB Connected. Starting Identity Resolution...");

        // Strategy: Iterate Donations that have NULL DonorID
        // We use a "Cursor" approach or Offset paging to handle 640k rows.

        let processed = 0;
        let created = 0;
        let matched = 0;

        // 1. Get Total Count
        const countRes = await client.query('SELECT COUNT(*) FROM "Donations" WHERE "DonorID" IS NULL');
        const total = parseInt(countRes.rows[0].count);
        console.log(`📊 Found ${total} donations needing resolution.`);

        while (true) {
            // Fetch Batch
            const res = await client.query(`
                SELECT "DonationID", "DonorEmail", "DonorFirstName", "DonorLastName", "DonorPhone", "DonorAddress", "DonorCity", "DonorState", "DonorZip"
                FROM "Donations"
                WHERE "DonorID" IS NULL
                LIMIT $1
            `, [BATCH_SIZE]);

            if (res.rows.length === 0) break;

            for (const d of res.rows) {
                // Determine Identity
                let donorId = null;

                // TIER 1: Email Match (Highest Confidence)
                if (d.DonorEmail && d.DonorEmail.length > 5) { // Basic validation
                    const emailMatch = await client.query('SELECT "DonorID" FROM "Donors" WHERE LOWER("Email") = LOWER($1)', [d.DonorEmail]);
                    if (emailMatch.rows.length > 0) {
                        donorId = emailMatch.rows[0].DonorID;
                    }
                }

                // TIER 2: Name Match (If no email match)
                if (!donorId && d.DonorFirstName && d.DonorLastName) {
                    const nameMatch = await client.query(`
                        SELECT "DonorID" FROM "Donors" 
                        WHERE LOWER("FirstName") = LOWER($1) AND LOWER("LastName") = LOWER($2)
                    `, [d.DonorFirstName, d.DonorLastName]);

                    if (nameMatch.rows.length > 0) {
                        donorId = nameMatch.rows[0].DonorID;
                    }
                }

                // TIER 3: Create New Profile
                if (!donorId) {
                    const newDonor = await client.query(`
                        INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip")
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING "DonorID"
                    `, [d.DonorFirstName, d.DonorLastName, d.DonorEmail, d.DonorPhone, d.DonorAddress, d.DonorCity, d.DonorState, d.DonorZip]);
                    donorId = newDonor.rows[0].DonorID;
                    created++;
                } else {
                    matched++;
                }

                // Link Donation
                await client.query('UPDATE "Donations" SET "DonorID" = $1 WHERE "DonationID" = $2', [donorId, d.DonationID]);
                processed++;
            }

            console.log(`🔹 Processed ${processed}/${total} | Created: ${created} | Matched: ${matched}`);
        }

        console.log("✅ IDENTITY RESOLUTION COMPLETE!");

    } catch (e) {
        console.error("❌ Resolution Failed:", e);
    } finally {
        await client.end();
    }
}

resolveDonors();
