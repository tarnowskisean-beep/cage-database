
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const { bankTransactionId, systemItemId, systemItemType } = await req.json();

        if (!bankTransactionId || !systemItemId || !systemItemType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate Period ownership? (Implicit via query filters usually, but good to be safe)

        if (systemItemType === 'Batch') {
            await query(`
                UPDATE "ReconciliationBankTransactions"
                SET "MatchedBatchID" = $1, "Status" = 'Matched', "MatchedDonationID" = NULL
                WHERE "TransactionID" = $2 AND "ReconciliationPeriodID" = $3
            `, [systemItemId, bankTransactionId, id]);
        } else if (systemItemType === 'Donation') {
            // System Item ID might be "REF-123" or "FEE-123". Need to extract numeric ID.
            const numericId = parseInt(systemItemId.replace(/[^0-9]/g, ''));

            await query(`
                UPDATE "ReconciliationBankTransactions"
                SET "MatchedDonationID" = $1, "Status" = 'Matched', "MatchedBatchID" = NULL
                WHERE "TransactionID" = $2 AND "ReconciliationPeriodID" = $3
            `, [numericId, bankTransactionId, id]);
        } else {
            return NextResponse.json({ error: 'Invalid system item type' }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error('Match Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
