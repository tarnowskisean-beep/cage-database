
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Fetch Pending Donations
        // Join with Candidates to get the suggestions
        // We might want to group them in the UI, but API can return flat or nested.
        // Let's return nested for easier UI handling.

        const pendingRes = await query(`
            SELECT 
                d."DonationID", d."GiftDate", d."GiftAmount", d."DonorFirstName", d."DonorLastName", 
                d."DonorEmail", d."DonorAddress", d."DonorCity", d."DonorState", d."DonorZip"
            FROM "Donations" d
            WHERE d."ResolutionStatus" = 'Pending'
            ORDER BY d."GiftDate" DESC
        `);

        const pendingDonations = pendingRes.rows;

        if (pendingDonations.length === 0) {
            return NextResponse.json([]);
        }

        // Fetch Candidates for these donations
        const donationIds = pendingDonations.map((d: any) => d.DonationID);
        const candidatesRes = await query(`
            SELECT 
                c."DonationID", c."Score", c."Reason",
                dor."DonorID", dor."FirstName", dor."LastName", dor."Email", dor."Address", dor."City", dor."State", dor."Zip"
            FROM "DonationResolutionCandidates" c
            JOIN "Donors" dor ON c."DonorID" = dor."DonorID"
            WHERE c."DonationID" = ANY($1)
            ORDER BY c."Score" DESC
        `, [donationIds]);

        // Merge
        const result = pendingDonations.map((d: any) => ({
            ...d,
            Candidates: candidatesRes.rows.filter((c: any) => c.DonationID === d.DonationID)
        }));

        return NextResponse.json(result);

    } catch (e: any) {
        console.error("Resolution Queue Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
