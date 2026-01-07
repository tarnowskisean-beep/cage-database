
import { query, transaction } from '../lib/db';

async function seedResolutionQueue() {
    console.log('Seeding Resolution Queue...');

    try {
        await transaction(async (client) => {
            // 1. Pick 5 random donations to flag
            const donationsRes = await client.query(`
                SELECT "DonationID", "DonorFirstName", "DonorLastName" 
                FROM "Donations" 
                ORDER BY RANDOM() 
                LIMIT 5
            `);

            if (donationsRes.rows.length === 0) {
                console.log('No donations found to flag.');
                return;
            }

            console.log(`Flagging ${donationsRes.rows.length} donations...`);

            // 2. Fetch some random donors to be candidates
            const donorsRes = await client.query(`
                SELECT "DonorID", "FirstName", "LastName" 
                FROM "Donors" 
                ORDER BY RANDOM() 
                LIMIT 10
            `);
            const pool = donorsRes.rows;

            for (const d of donationsRes.rows) {
                // Update Status
                await client.query(`
                    UPDATE "Donations" 
                    SET "ResolutionStatus" = 'Pending' 
                    WHERE "DonationID" = $1
                `, [d.DonationID]);

                // Insert 1-3 Candidates
                const numCandidates = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < numCandidates; i++) {
                    const candidate = pool[Math.floor(Math.random() * pool.length)];
                    await client.query(`
                        INSERT INTO "DonationResolutionCandidates" 
                        ("DonationID", "DonorID", "Score", "Reason")
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT DO NOTHING
                    `, [
                        d.DonationID,
                        candidate.DonorID,
                        (0.7 + Math.random() * 0.29).toFixed(2), // Score 0.70 - 0.99
                        ['Name Similarity', 'Address Match', 'Email Match', 'History Analysis'][Math.floor(Math.random() * 4)]
                    ]);
                }
            }
        });

        console.log('Resolution Queue Seeded Successfully.');

    } catch (e) {
        console.error('Seeding Failed:', e);
    }
}

seedResolutionQueue();
