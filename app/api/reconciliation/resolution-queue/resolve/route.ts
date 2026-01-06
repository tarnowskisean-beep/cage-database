
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { donationId, action, candidateId } = await req.json();

        if (!donationId || !action) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        if (action === 'Link') {
            if (!candidateId) return NextResponse.json({ error: 'Missing Candidate ID' }, { status: 400 });

            // Get DonorID from Candidate (or passed directly if we trust FE, but better from DB or check)
            // Let's assume candidateId is the actual DonorID for simplicity of this action payload 
            // OR strictly use the Candidate table. 
            // Let's interpret candidateId as DonorID for flexibility (e.g. manual search).

            await query(`
                UPDATE "Donations" 
                SET "DonorID" = $1, "ResolutionStatus" = 'Resolved'
                WHERE "DonationID" = $2
            `, [candidateId, donationId]);

        } else if (action === 'CreateNew') {
            // Logic to create new donor is complex if we need to copy fields.
            // But wait, the original logic in lib/people.ts handles creation if no match.
            // We can just manually insert a new donor using the Donation fields.

            const donationRes = await query('SELECT * FROM "Donations" WHERE "DonationID" = $1', [donationId]);
            if (donationRes.rows.length === 0) return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
            const donation = donationRes.rows[0];

            const newDonor = await query(`
                INSERT INTO "Donors" 
                ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip", "CreatedAt", "UpdatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING "DonorID"
            `, [
                donation.DonorFirstName,
                donation.DonorLastName,
                donation.DonorEmail,
                donation.DonorPhone,
                donation.DonorAddress,
                donation.DonorCity,
                donation.DonorState,
                donation.DonorZip
            ]);

            const newDonorId = newDonor.rows[0].DonorID;

            await query(`
                UPDATE "Donations" 
                SET "DonorID" = $1, "ResolutionStatus" = 'Resolved'
                WHERE "DonationID" = $2
            `, [newDonorId, donationId]);

        } else {
            return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });
        }

        // Cleanup Candidates? Optional, but good practice.
        await query('DELETE FROM "DonationResolutionCandidates" WHERE "DonationID" = $1', [donationId]);

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Resolution Action Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
