
import { query } from '@/lib/db';

/**
 * Attempts to link a single donation to an existing Donor profile,
 * or creates a new Donor profile if no match is found.
 * 
 * Logic:
 * 1. Tier 1: Exact Email Match (High Confidence)
 * 2. Tier 2: Exact Name Match (Medium Confidence)
 * 3. Tier 3: Create New
 * 
 * @param donation The donation record (must contain DonorEmail, DonorFirstName, etc.)
 * @returns The DonorID linked to the donation
 */
export async function resolveDonationIdentity(donation: any, dbClient?: any): Promise<number> {
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
    // "Jon" matches "Jonathan" if they live in the same Zip code.
    if (!donorId && first && last && zip && zip.length >= 5) {
        // We use similarity() from pg_trgm. Threshold 0.4 implies decent similarity.
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
            // AMBIGUOUS: Do not auto-link. Queue for resolution.
            await runQuery('UPDATE "Donations" SET "ResolutionStatus" = \'Pending\' WHERE "DonationID" = $1', [donation.DonationID]);

            for (const m of fuzzyNameMatches.rows) {
                await runQuery(`
                    INSERT INTO "DonationResolutionCandidates" ("DonationID", "DonorID", "Score", "Reason")
                    VALUES ($1, $2, $3, 'Fuzzy Name Match')
                `, [donation.DonationID, m.DonorID, m.score]);
            }
            return 0; // Return 0 to indicate no immediate link
        }
    }

    // TIER 4: Fuzzy Address (Exact Last + Similar Address)
    // "123 Main St" vs "123 Main Street"
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
            // AMBIGUOUS: Do not auto-link. Queue for resolution.
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

    // TIER 5: Create New
    // ONLY if no ambiguous matches were found
    if (!donorId && ((first && last) || email)) {
        const newDonor = await runQuery(`
            INSERT INTO "Donors" 
            ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip", "CreatedAt", "UpdatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING "DonorID"
        `, [
            first || null,
            last || null,
            email || null,
            donation.DonorPhone || null,
            donation.DonorAddress || null,
            donation.DonorCity || null,
            donation.DonorState || null,
            donation.DonorZip || null
        ]);
        donorId = newDonor.rows[0].DonorID;

        // Mark as Resolved since we just created it
        await runQuery('UPDATE "Donations" SET "ResolutionStatus" = \'Resolved\' WHERE "DonationID" = $1', [donation.DonationID]);
    }

    // Update Donation Record if we found/created a donor
    if (donorId) {
        await runQuery('UPDATE "Donations" SET "DonorID" = $1, "ResolutionStatus" = \'Resolved\' WHERE "DonationID" = $2', [donorId, donation.DonationID]);
    }

    return donorId || 0;
}

/**
 * Bulk resolves all donations in a list of Batches.
 * Used during Reconciliation.
 */
export async function resolveBatchDonations(batchIds: number[]) {
    if (!batchIds.length) return;

    // Fetch all donations in these batches that need resolution
    // (We also re-check ones that might be NULL)
    const donations = await query(`
        SELECT * FROM "Donations" 
        WHERE "BatchID" = ANY($1) 
        AND "DonorID" IS NULL
    `, [batchIds]);

    console.log(`🔍 Resolving identities for ${donations.rows.length} donations in batches [${batchIds.join(', ')}]...`);

    for (const d of donations.rows) {
        await resolveDonationIdentity(d);
    }
}
