
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params; // Period ID (not strictly needed for the update query but good for validation)
        const body = await request.json();
        const { type, itemId, cleared } = body;

        if (!type || !itemId || cleared === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (type === 'batch') {
            await query(
                `UPDATE "Batches" SET "Cleared" = $1 WHERE "BatchID" = $2`,
                [cleared, itemId]
            );
        } else if (type === 'transaction') {
            await query(
                `UPDATE "ReconciliationBankTransactions" SET "Cleared" = $1 WHERE "TransactionID" = $2`,
                [cleared, itemId]
            );
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error toggling item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
