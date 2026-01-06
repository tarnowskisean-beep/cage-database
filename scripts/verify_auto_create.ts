
import { query } from '@/lib/db';
import { resolveDonationIdentity } from '@/lib/people';

async function verify() {
    try {
        console.log('🧪 Verifying "No Match" Auto-Create Logic...');

        // 1. Create a "Unique" Donation that definitely has no match
        // "Zaphod Beeblebrox" in "Betelgeuse"
        const uniqueName = `Zaphod${Date.now()}`;

        const clientRes = await query('SELECT "ClientID" FROM "Clients" LIMIT 1');
        const clientId = clientRes.rows[0]?.ClientID || 1;

        const donationRes = await query(`
            INSERT INTO "Donations" 
            ("ClientID", "TransactionType", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", 
             "DonorFirstName", "DonorLastName", "DonorZip", "DonorAddress", "ResolutionStatus")
            VALUES ($1, 'Donation', 42.00, 'Check', 'Manual', NOW(), $2, 'Beeblebrox', '00000', 'Heart of Gold', 'Resolved')
            RETURNING "DonationID", "ResolutionStatus", "DonorID"
        `, [clientId, uniqueName]);

        let donation = donationRes.rows[0];
        console.log(`Created Test Donation: ${uniqueName} Beeblebrox (ID: ${donation.DonationID})`);

        // Check pre-condition (should range from 'Resolved' default or null donor)
        // Actually our insert above set 'Resolved' but let's reset it to mimic a fresh batch item?
        // Actually resolveDonationIdentity handles it regardless of current status, but let's be clean.
        await query('UPDATE "Donations" SET "DonorID" = NULL, "ResolutionStatus" = \'Resolved\' WHERE "DonationID" = $1', [donation.DonationID]);

        // 2. Run Resolution
        console.log('Running Resolution...');
        const donorId = await resolveDonationIdentity({
            DonationID: donation.DonationID,
            DonorFirstName: uniqueName,
            DonorLastName: 'Beeblebrox',
            DonorZip: '00000',
            DonorAddress: 'Heart of Gold',
            DonorEmail: null
        });

        // 3. Status Check
        const finalRes = await query('SELECT "ResolutionStatus", "DonorID" FROM "Donations" WHERE "DonationID" = $1', [donation.DonationID]);
        const finalStatus = finalRes.rows[0].ResolutionStatus;
        const finalDonorId = finalRes.rows[0].DonorID;

        console.log(`Result: Status=${finalStatus}, DonorID=${finalDonorId}`);

        if (finalStatus === 'Resolved' && finalDonorId && finalDonorId === donorId) {
            console.log('✅ SUCCESS: "No Match" was automatically created and resolved.');
        } else {
            console.error('❌ FAILURE: Item did not auto-resolve correctly.');
            console.error('Expected Status: Resolved, Got:', finalStatus);
            console.error('Expected DonorID: Truthy, Got:', finalDonorId);
            process.exit(1);
        }

        // Cleanup
        await query('DELETE FROM "Donations" WHERE "DonationID" = $1', [donation.DonationID]);
        await query('DELETE FROM "Donors" WHERE "DonorID" = $1', [finalDonorId]);

        process.exit(0);
    } catch (e) {
        console.error('Verification Failed:', e);
        process.exit(1);
    }
}

verify();
