const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');

// Load environment variables
const envFiles = ['.env.local', '.env'];
envFiles.forEach(path => dotenv.config({ path }));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const REPEAT_DONOR_RATE = 0.3; // 30% chance of repeat donor

async function fixDonorNames() {
    const client = await pool.connect();
    try {
        console.log("🩹 Starting Donor Name & ID Fix...");

        // 1. Fetch Existing Donors (to simulate repeats from real data if any)
        const existingDonorsRes = await client.query('SELECT "DonorID", "FirstName", "LastName" FROM "Donors" LIMIT 1000');
        let donorCache = existingDonorsRes.rows.map(d => ({
            id: d.DonorID,
            first: d.FirstName,
            last: d.LastName
        }));

        console.log(`Loaded ${donorCache.length} existing donors for repeat simulation.`);

        let processed = 0;
        let running = true;

        while (running) {
            // Fetch batches of donations with missing DonorID
            // checking 'DonorID' IS NULL is the key
            const donationsRes = await client.query(`
                SELECT "DonationID", "ClientID" 
                FROM "Donations" 
                WHERE "DonorID" IS NULL 
                LIMIT 1000
            `);

            if (donationsRes.rows.length === 0) {
                console.log("✅ All donations linked!");
                running = false;
                break;
            }

            console.log(`Processing batch of ${donationsRes.rows.length} records...`);

            for (const donation of donationsRes.rows) {
                let donorId;
                let firstName;
                let lastName;

                // Simulate Repeat Donor
                if (donorCache.length > 0 && Math.random() < REPEAT_DONOR_RATE) {
                    const repeat = faker.helpers.arrayElement(donorCache);
                    donorId = repeat.id;
                    firstName = repeat.first;
                    lastName = repeat.last;
                } else {
                    // Create New Donor
                    firstName = faker.person.firstName();
                    lastName = faker.person.lastName();

                    try {
                        // Insert into Donors
                        const donorRes = await client.query(`
                            INSERT INTO "Donors" ("FirstName", "LastName", "Email", "CreatedAt", "UpdatedAt")
                            VALUES ($1, $2, $3, NOW(), NOW())
                            RETURNING "DonorID"
                        `, [firstName, lastName, faker.internet.email(firstName, lastName)]);

                        donorId = donorRes.rows[0].DonorID;

                        // Add to cache
                        donorCache.push({ id: donorId, first: firstName, last: lastName });
                        if (donorCache.length > 2000) donorCache.shift(); // Keep cache manageable
                    } catch (err) {
                        console.error("Failed to create donor:", err);
                        continue;
                    }
                }

                // Update Donation
                // We check if PaymentName exists based on previous errors, but we know DonorFirstName/Last exist.
                // Let's try to update standard fields.
                // Note: Schema check showed DonorFirstName, DonorLastName. 
                // It didn't confirm PaymentName explicitly in the array I saw (truncated?), but seed script failed on it.
                // So I will update DonorFirstName, DonorLastName, and DonorID.
                try {
                    await client.query(`
                        UPDATE "Donations"
                        SET "DonorID" = $1, "DonorFirstName" = $2, "DonorLastName" = $3
                        WHERE "DonationID" = $4
                    `, [donorId, firstName, lastName, donation.DonationID]);
                } catch (updateErr) {
                    console.error(`Failed to update donation ${donation.DonationID}:`, updateErr.message);
                    // Safe fallback if columns are strict
                }

                processed++;
                if (processed % 500 === 0) console.log(`  Linked ${processed} donations...`);
            }
        }

        console.log("🎉 Done! All donations now have Donor information.");

    } catch (err) {
        console.error("Critical Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixDonorNames();
