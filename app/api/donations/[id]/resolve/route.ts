
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const donationId = parseInt(id);

        if (isNaN(donationId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Update IsFlagged to FALSE (Resolve the Flag)
        const result = await query(
            `UPDATE "Donations" 
             SET "IsFlagged" = FALSE 
             WHERE "DonationID" = $1 
             RETURNING "DonationID", "IsFlagged", "ResolutionStatus"`,
            [donationId]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }

        // Log Audit
        await logAudit(
            (session.user as any).id,
            'ResolveDonation',
            donationId,
            { action: 'Resolved Flag' }
        );

        return NextResponse.json({ success: true, donation: result.rows[0] });

    } catch (error: any) {
        console.error('POST /api/donations/[id]/resolve error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
