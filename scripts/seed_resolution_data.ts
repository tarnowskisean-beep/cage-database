
import { query } from '@/lib/db';

async function seed() {
    try {
        console.log('🌱 Seeding Resolution Queue Data...');

        // 1. Create Existing Donor "Jonathan Doe"
        const donorRes = await query(`
            INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Zip", "Address", "City", "State")
            VALUES ('Jonathan', 'Doe', 'jondoe@example.com', '90210', '123 Main St', 'Beverly Hills', 'CA')
            RETURNING "DonorID"
        `);
        const donorId = donorRes.rows[0].DonorID;
        console.log(`Created Donor: Jonathan Doe (ID: ${donorId})`);

        // 2. Create "Pending" Donation from "Jon Doe"
        // Need a Batch first? Or just insert nil batch.
        // Let's create a Client first if needed, but assuming ClientID 1 exists.
        // We'll check for a client.
        const clientRes = await query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        const clientId = clientRes.rows[0]?.ClientID || 1;

        const donationRes = await query(`
            INSERT INTO "Donations" 
            ("ClientID", "TransactionType", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", 
             "DonorFirstName", "DonorLastName", "DonorZip", "DonorAddress", "ResolutionStatus")
            VALUES ($1, 'Donation', 100.00, 'Check', 'Manual', NOW(), 'Jon', 'Doe', '90210', '123 Main St', 'Pending')
            RETURNING "DonationID"
        `, [clientId]);
        const donationId = donationRes.rows[0].DonationID;
        console.log(`Created Pending Donation: Jon Doe (ID: ${donationId})`);

        // 3. Create Candidate
        await query(`
            INSERT INTO "DonationResolutionCandidates" ("DonationID", "DonorID", "Score", "Reason")
            VALUES ($1, $2, 0.85, 'Fuzzy Name Match (Jon vs Jonathan)')
        `, [donationId, donorId]);

        console.log('✅ Seeding Complete!');
        process.exit(0);

    } catch (e) {
        console.error('Seeding Failed:', e);
        process.exit(1);
    }
}

seed();
