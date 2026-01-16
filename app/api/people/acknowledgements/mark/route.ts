
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { ids, type } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const field = type === 'TaxReceipt' ? 'TaxReceiptSentAt' : 'ThankYouSentAt';

        // Update all provided IDs
        // Note: PG doesn't support "UPDATE ... WHERE ID IN (...)" specifically cleanly with params array in one go without unnest or separate calls, 
        // but ANY($1) works great.

        await query(`
            UPDATE "Donations"
            SET "${field}" = NOW()
            WHERE "DonationID" = ANY($1)
        `, [ids]);

        return NextResponse.json({ success: true, count: ids.length });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
