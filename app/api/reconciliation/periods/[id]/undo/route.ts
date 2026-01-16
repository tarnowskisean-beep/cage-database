
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const user = session.user;

    const { id: periodId } = await params;

    try {
        const result = await transaction(async (client) => {
            // 1. Verify Period Status
            const periodRes = await client.query(`SELECT "Status" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1 FOR UPDATE`, [periodId]);
            if (periodRes.rows.length === 0) throw new Error('Period not found');

            if (periodRes.rows[0].Status !== 'Reconciled') {
                throw new Error('Period is not reconciled. Cannot undo.');
            }

            // 2. Find Linked Batches (that are Reconciled)
            const batchRes = await client.query(`
                SELECT DISTINCT b."BatchID"
                FROM "ReconciliationBatchDetails" rbd
                JOIN "Batches" b ON rbd."BatchID" = b."BatchID"
                WHERE rbd."ReconciliationPeriodID" = $1
                AND b."Status" = 'Reconciled'
            `, [periodId]);

            const batchIds = batchRes.rows.map((r: any) => r.BatchID);

            // 3. Revert Batches to 'Closed' (Assume they were closed before reconciling)
            // or 'Submitted'? Usually 'Closed' is the state prior to 'Reconciled'.
            if (batchIds.length > 0) {
                await client.query(`
                    UPDATE "Batches" 
                    SET "Status" = 'Closed', "SubmittedAt" = NULL 
                    WHERE "BatchID" = ANY($1)
                `, [batchIds]);
            }

            // 4. Revert Period
            await client.query(`
                UPDATE "ReconciliationPeriods"
                SET "Status" = 'Open', "BankBalanceVerified" = FALSE
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId]);

            // 5. Audit
            await logAudit('UNDO_RECONCILIATION', 'ReconciliationPeriod', periodId, `Reverted status from Reconciled to Open. Affected Batches: ${batchIds.join(', ')}`, user.email || 'system');

            return { success: true, count: batchIds.length };
        });

        return NextResponse.json(result);

    } catch (e: any) {
        console.error('Undo Reconciliation Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
