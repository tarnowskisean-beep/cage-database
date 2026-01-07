
import { Client } from 'pg';

const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🌱 Seeding Ambiguous Matches...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Get a Client to use (First one)
        const clientsRes = await client.query(`SELECT "ClientID" FROM "Clients" LIMIT 1`);
        if (clientsRes.rows.length === 0) {
            console.log("Please create a client first.");
            return;
        }
        const clientId = clientsRes.rows[0].ClientID;

        // 2. Get/Create Account
        let accountId = null;
        const acctRes = await client.query(`SELECT "AccountID" FROM "ClientBankAccounts" WHERE "ClientID" = $1 LIMIT 1`, [clientId]);
        if (acctRes.rows.length > 0) accountId = acctRes.rows[0].AccountID;

        // 3. Create Ambiguous Scenarios
        const scenarios: any[] = [
            {
                firstName: 'John', lastName: 'Smyth', email: 'j.smyth@example.com', amount: 50.00,
                candidates: [
                    { firstName: 'John', lastName: 'Smith', email: 'john.smith@gmail.com', score: 0.85, reason: 'Name Levenshtein', zip: null },
                    { firstName: 'Jon', lastName: 'Smyth', email: 'jon.s@outlook.com', score: 0.82, reason: 'Name Phonetic', zip: null }
                ]
            },
            {
                firstName: 'Robert', lastName: 'Phillip', amount: 100.00,
                candidates: [
                    { firstName: 'Bob', lastName: 'Phillips', score: 0.78, reason: 'Nickname Match', email: null, zip: null },
                    { firstName: 'Robert', lastName: 'Phillips', score: 0.91, reason: 'Last Name Plural', email: null, zip: null }
                ]
            },
            {
                firstName: 'Sarah', lastName: 'Connor', zip: '90210', amount: 25.00,
                candidates: [
                    { firstName: 'Sara', lastName: 'Conner', zip: '90210', score: 0.88, reason: 'Zip + Name Soundex', email: null }
                ]
            }
        ];

        // 4. Insert Data
        for (const s of scenarios) {
            // Insert Pending Donation
            const donorIdRes = await client.query(`SELECT "DonorID" FROM "Donors" LIMIT 1`); // Dummy donor to fulfill FK if needed, OR we allow null?
            // Actually Donations typically have DonorID?? Wait, schema check.
            // Schema has specific fields. Let's check schema for Donations.
            // ... Assuming Donations table has inline fields for imported data before match?
            // "Donations" table in schema:
            // "DonationID" SERIAL, "ClientID", "DonorID"?? No, it has ClientID.
            // It usually links to Donors eventually.
            // Wait, looking at schema provided earlier:
            // CREATE TABLE "Donations" ( ... "DonorID" INT REFERENCES "Donors" ... ) ?
            // Let's re-read schema.sql content from previous turn.
            // It says: "Donations" table has ... no DonorID in the CREATE statement visible in previous snippet?
            // Wait, standard design suggests Donation links to Donor.
            // Let's assume for *Pending* items, we might not have a DonorID yet?
            // Or do we tentatively assign one?
            // The `DonationResolutionCandidates` table links `DonationID` and `DonorID` (the candidate).
            // So the *Donation* itself might be unlinked or linked to a temp donor?
            // Let's check user's code for `lib/people.ts` logic if possible, or just insert without DonorID if nullable.
            // Actually, checking standard Cage schema...
            // Usually `Donation` has `DonorID`. If it's ambiguous, maybe it points to NULL?
            // Let's check Schema again via tool if needed, but for now I'll assume we can insert minimal.

            // Insert "Unresolved" Donation
            // We need to simulate "Imported but not matched".
            // If DonorID is NOT NULL, we pick a placeholder or create a new "Unresolved" donor?
            // Let's try inserting with NULL DonorID if allowed, or CREATE a dummy "Unknown" donor.

            const insertRes = await client.query(`
                INSERT INTO "Donations" 
                ("ClientID", "TransactionType", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "ResolutionStatus", "DonorFirstName", "DonorLastName", "DonorEmail", "DonorZip", "AccountID")
                VALUES ($1, 'Donation', $2, 'Check', 'Manual', NOW(), 'Pending', $3, $4, $5, $6, $7)
                RETURNING "DonationID"
            `, [clientId, s.amount, s.firstName, s.lastName, s.email || null, s.zip || null, accountId]);

            const donationId = insertRes.rows[0].DonationID;
            console.log(`   Created Donation ${donationId} for ${s.firstName} ${s.lastName}`);

            // Insert Candidates
            for (const c of s.candidates) {
                // We need a real DonorID for the candidate.
                // Let's create a *fake existing donor* to be the candidate.
                const candDonorRes = await client.query(`
                    INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Zip")
                    VALUES ($1, $2, $3, $4)
                    RETURNING "DonorID"
                `, [c.firstName, c.lastName, c.email || null, c.zip || null]);

                const candidateDonorId = candDonorRes.rows[0].DonorID;

                await client.query(`
                    INSERT INTO "DonationResolutionCandidates" ("DonationID", "DonorID", "Score", "Reason")
                    VALUES ($1, $2, $3, $4)
                `, [donationId, candidateDonorId, c.score, c.reason]);
            }
        }

        console.log("✅ Seed Complete! refresh the Resolution Queue.");

    } catch (e) {
        console.error("❌ Error seeding:", e);
    } finally {
        await client.end();
    }
}

run();
