
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const body = await req.json();
        const { type, status } = body;
        // type: 'ThankYou' | 'TaxReceipt'
        // status: boolean (true = sent now, false = not sent)

        if (!type || status === undefined) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        let column = '';
        if (type === 'ThankYou') column = '"ThankYouSentAt"';
        else if (type === 'TaxReceipt') column = '"TaxReceiptSentAt"';
        else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

        const val = status ? new Date() : null;

        await query(`
            UPDATE "Donations"
            SET ${column} = $1
            WHERE "DonationID" = $2
        `, [val, id]);

        return NextResponse.json({ success: true, timestamp: val });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
