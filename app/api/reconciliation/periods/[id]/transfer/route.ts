
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '../../../../lib/db';

// POST /api/reconciliation/periods/[id]/transfer
// Action: 'schedule' or 'complete'
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const userId = session.user?.id;
    const periodId = params.id;
    const body = await req.json();
    const { action, date, ref } = body; // action='schedule'|'complete'

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const periodRes = await client.query(`SELECT "Status", "TotalPeriodAmount" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
        const period = periodRes.rows[0];

        if (action === 'schedule') {
            if (period.Status !== 'Reconciled') throw new Error('Period must be Reconciled before scheduling transfer.');

            await client.query(`
                UPDATE "ReconciliationPeriods"
                SET "Status" = 'Scheduled', "ScheduledTransferDate" = $2
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId, date]); // date overrides default if provided

            // Email Notification Mock
            // console.log("Sending email to client...");

        } else if (action === 'complete') {
            if (period.Status !== 'Scheduled') throw new Error('Period must be Scheduled before completing.');

            await client.query(`
                UPDATE "ReconciliationPeriods"
                SET "Status" = 'Transferred', "ActualTransferDate" = $2
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId, date || new Date()]);

            // Add "Transfer Out" transaction
            await client.query(`
                INSERT INTO "ReconciliationBankTransactions"
                ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountOut", "Description", "ReferenceNumber", "Matched", "StatementImported")
                VALUES 
                ($1, (SELECT "ClientID" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID"=$1), $2, 'Transfer Out', $3, 'Transfer to Client', $4, TRUE, FALSE)
            `, [periodId, date || new Date(), period.TotalPeriodAmount, ref]);
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true });

    } catch (e: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        client.release();
    }
}
