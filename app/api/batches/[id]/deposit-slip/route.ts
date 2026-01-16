
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateDepositSlip } from '@/lib/deposit-slips';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        // 1. Fetch Batch
        const batchRes = await query('SELECT * FROM "Batches" WHERE "BatchID" = $1', [id]);
        if (batchRes.rows.length === 0) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        const batch = batchRes.rows[0];

        // 2. Fetch Donations (Checks Only?)
        // Usually deposit slips are for Checks + Cash.
        // We will include everything that is not Credit/EFT, or maybe strictly filter by Checks?
        // User asked for "ICS files" / "Deposit Slips", implies Checks.
        // We'll filter for visual clarity, or let the service decide.
        // Let's fetch all and filter in JS or SQL. SQL is better.

        // Filter: GiftMethod IN ('Check', 'Cash') AND ResolutionStatus != 'Void'
        const donationsRes = await query(`
            SELECT * FROM "Donations" 
            WHERE "BatchID" = $1 
            AND "GiftMethod" IN ('Check', 'Cash')
            AND "ResolutionStatus" != 'Void'
            ORDER BY "DonationID" ASC
        `, [id]);

        const donations = donationsRes.rows;

        if (donations.length === 0) {
            return NextResponse.json({ error: 'No checks or cash found in this batch to deposit.' }, { status: 400 });
        }

        // 3. Generate PDF
        const pdfBuffer = await generateDepositSlip(batch, donations);

        // 4. Return Stream
        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="DepositSlip_${batch.BatchCode}.pdf"`
            }
        });

    } catch (e: any) {
        console.error('Deposit slip generation failed', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
