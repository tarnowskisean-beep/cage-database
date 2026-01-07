
import { query, transaction } from '../lib/db';

// Copied from lib/people.ts to avoid ts-node alias issues
async function resolveDonationIdentity(donation: any, dbClient?: any): Promise<number> {
    const runQuery = (sql: string, params: any[]) => dbClient ? dbClient.query(sql, params) : query(sql, params);

    // If already linked, return (or verify?)
    if (donation.DonorID) return donation.DonorID;

    let donorId: number | null = null;
    const email = donation.DonorEmail?.trim();
    const first = donation.DonorFirstName?.trim();
    const last = donation.DonorLastName?.trim();
    const zip = donation.DonorZip?.trim();
    const address = donation.DonorAddress?.trim();

    // TIER 1: Email (Exact)
    if (email && email.length > 5 && email.includes('@')) {
        const emailMatch = await runQuery('SELECT "DonorID" FROM "Donors" WHERE LOWER("Email") = LOWER($1)', [email]);
        if (emailMatch.rows.length > 0) donorId = emailMatch.rows[0].DonorID;
    }

    // TIER 2: Name (Exact)
    if (!donorId && first && last) {
        const nameMatch = await runQuery(`
            SELECT "DonorID" FROM "Donors" 
            WHERE LOWER("FirstName") = LOWER($1) AND LOWER("LastName") = LOWER($2)
        `, [first, last]);
        if (nameMatch.rows.length > 0) donorId = nameMatch.rows[0].DonorID;
    }

    // TIER 3: Fuzzy Name (Exact Last + Exact Zip + Similar First)
    if (!donorId && first && last && zip && zip.length >= 5) {
        const fuzzyNameMatches = await runQuery(`
            SELECT "DonorID", similarity("FirstName", $1) as score
            FROM "Donors"
            WHERE LOWER("LastName") = LOWER($2)
            AND "Zip" = $3
            AND similarity("FirstName", $1) > 0.3
            ORDER BY score DESC
            LIMIT 5
        `, [first, last, zip]);

        if (fuzzyNameMatches.rows.length > 0) {
            console.log(`💡 Fuzzy Name Potential Matches Found: ${fuzzyNameMatches.rows.length}`);
            await runQuery('UPDATE "Donations" SET "ResolutionStatus" = \'Pending\' WHERE "DonationID" = $1', [donation.DonationID]);

            for (const m of fuzzyNameMatches.rows) {
                await runQuery(`
                    INSERT INTO "DonationResolutionCandidates" ("DonationID", "DonorID", "Score", "Reason")
                    VALUES ($1, $2, $3, 'Fuzzy Name Match')
                `, [donation.DonationID, m.DonorID, m.score]);
            }
            return 0;
        }
    }

    // TIER 4: Fuzzy Address (Exact Last + Similar Address)
    if (!donorId && last && address && address.length > 5) {
        const fuzzyAddrMatches = await runQuery(`
            SELECT "DonorID", similarity("Address", $1) as score
            FROM "Donors"
            WHERE LOWER("LastName") = LOWER($2)
            AND similarity("Address", $1) > 0.6
            ORDER BY score DESC
            LIMIT 5
        `, [address, last]);

        if (fuzzyAddrMatches.rows.length > 0) {
            console.log(`💡 Fuzzy Address Potential Matches Found: ${fuzzyAddrMatches.rows.length}`);
            await runQuery('UPDATE "Donations" SET "ResolutionStatus" = \'Pending\' WHERE "DonationID" = $1', [donation.DonationID]);

            for (const m of fuzzyAddrMatches.rows) {
                await runQuery(`
                    INSERT INTO "DonationResolutionCandidates" ("DonationID", "DonorID", "Score", "Reason")
                    VALUES ($1, $2, $3, 'Fuzzy Address Match')
                `, [donation.DonationID, m.DonorID, m.score]);
            }
            return 0;
        }
    }

    return donorId || 0;
}

async function reseedSmart() {
    console.log('🌱 Starting Smart Reseed for Resolution Queue...');

    try {
        // 1. Enable Extension
        await query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // 2. Clear existing Pending/Candidates (Resetting state)
        console.log('🧹 Clearing old pending data...');
        await query('DELETE FROM "DonationResolutionCandidates"');
        await query(`UPDATE "Donations" SET "ResolutionStatus" = 'Resolved' WHERE "ResolutionStatus" = 'Pending'`);

        // 3. Create Scenarios
        await transaction(async (client) => {
            // Get a valid Batch and its Client
            const batchRes = await client.query('SELECT "BatchID", "ClientID" FROM "Batches" LIMIT 1');
            if (batchRes.rows.length === 0) {
                console.log('❌ No batches found. Cannot seed Donations.');
                return;
            }
            const { BatchID, ClientID } = batchRes.rows[0];

            // Scenario A: First Name Fuzzy (Jon vs Jonathan) + Same Zip
            console.log('🧪 Creating Scenario A: Jon vs Jonathan (Same Zip)...');

            // A1. Base Donor
            const resA = await client.query(`
                INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Zip", "CreatedAt", "UpdatedAt")
                VALUES ('Jonathan', 'Skywalker', 'luke.father@example.com', '90210', NOW(), NOW())
                ON CONFLICT DO NOTHING
                RETURNING "DonorID"
            `);
            // If exists, fetch ID
            let donorIdA;
            if (resA.rows.length > 0) donorIdA = resA.rows[0].DonorID;
            else {
                const fetch = await client.query(`SELECT "DonorID" FROM "Donors" WHERE "LastName" = 'Skywalker' AND "Zip" = '90210' LIMIT 1`);
                if (fetch.rows.length > 0) donorIdA = fetch.rows[0].DonorID;
            }

            if (donorIdA) {
                // A2. Ambiguous Donation (Jon Skywalker, 90210)
                const donA = await client.query(`
                    INSERT INTO "Donations" 
                    ("BatchID", "ClientID", "GiftDate", "GiftAmount", "DonorFirstName", "DonorLastName", "DonorZip", "ResolutionStatus", "CreatedAt", "TransactionType", "GiftMethod", "GiftPlatform", "GiftType", "GiftYear", "GiftQuarter")
                    VALUES (
                        $1, $2, 
                        NOW(), 
                        '150.00', 
                        'Jon', 'Skywalker', '90210', 
                        'Resolved', 
                        NOW(),
                        'Donation', 'Check', 'Cage', 'Individual/Trust/IRA', 2025, 'Q1'
                    )
                    RETURNING *
                `, [BatchID, ClientID]);

                console.log('🕵️‍♂️ Resolving Scenario A...');
                await resolveDonationIdentity(donA.rows[0], client);
            }


            // Scenario B: Address Fuzzy (Main St vs Main Street)
            console.log('🧪 Creating Scenario B: St vs Street (Same Last Name)...');

            // B1. Base Donor
            const resB = await client.query(`
                INSERT INTO "Donors" ("FirstName", "LastName", "Address", "City", "State", "Zip", "CreatedAt", "UpdatedAt")
                VALUES ('Sherlock', 'Holmes', '221B Baker Street', 'London', 'UK', '12345', NOW(), NOW())
                ON CONFLICT DO NOTHING
                RETURNING "DonorID"
            `);

            let donorIdB;
            if (resB.rows.length > 0) donorIdB = resB.rows[0].DonorID;
            else {
                const fetch = await client.query(`SELECT "DonorID" FROM "Donors" WHERE "LastName" = 'Holmes' AND "Zip" = '12345' LIMIT 1`);
                if (fetch.rows.length > 0) donorIdB = fetch.rows[0].DonorID;
            }

            if (donorIdB) {
                // B2. Ambiguous Donation
                const donB = await client.query(`
                    INSERT INTO "Donations" 
                    ("BatchID", "ClientID", "GiftDate", "GiftAmount", "DonorFirstName", "DonorLastName", "DonorAddress", "ResolutionStatus", "CreatedAt", "TransactionType", "GiftMethod", "GiftPlatform", "GiftType", "GiftYear", "GiftQuarter")
                    VALUES (
                        $1, $2,
                        NOW(), 
                        '500.00', 
                        'S.', 'Holmes', '221B Baker St', 
                        'Resolved', 
                        NOW(),
                        'Donation', 'Check', 'Cage', 'Individual/Trust/IRA', 2025, 'Q1'
                    )
                    RETURNING *
                `, [BatchID, ClientID]);

                console.log('🕵️‍♂️ Resolving Scenario B...');
                await resolveDonationIdentity(donB.rows[0], client);
            }
        });

        console.log('✅ Smart Reseed Complete. Refresh the Queue UI.');

    } catch (e) {
        console.error('❌ Reseed Failed:', e);
    }
}

reseedSmart();
