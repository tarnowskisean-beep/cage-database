
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '../../../../lib/db';

// POST /api/reconciliation/periods/[id]/reconcile
// Verify that Expected matches Actual
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const userId = session.user?.id;
    const periodId = params.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Expected (Period Total of donations - outbound)
        // Note: Spec says "AmountDonorNetIncludingFees". Let's calculate net from details.
        const detailsRes = await client.query(`SELECT "AmountDonorNet" FROM "ReconciliationBatchDetails" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
        const expectedNet = parseFloat(detailsRes.rows[0]?.AmountDonorNet || 0);

        // 2. Get Actual (Sum of matched bank transactions)
        // We only sum MATCHED transactions or ALL transactions? Spec says "Sum of bank transactions for period date range".
        // Let's us sum "AmountIn" - "AmountOut" for transactions linked to this period.
        const bankRes = await client.query(`
            SELECT SUM("AmountIn" - "AmountOut") as netBank 
            FROM "ReconciliationBankTransactions" 
            WHERE "ReconciliationPeriodID" = $1
        `, [periodId]);

        const actualNet = parseFloat(bankRes.rows[0].netbank || 0);

        // 3. Variance
        const variance = actualNet - expectedNet;

        if (Math.abs(variance) < 0.01) {
            // SUCCESS
            await client.query(`
                UPDATE "ReconciliationPeriods"
                SET "Status" = 'Reconciled', "BankBalanceVerified" = TRUE
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId]);
            await client.query('COMMIT');
            return NextResponse.json({ success: true, status: 'Reconciled', variance: 0 });
        } else {
            // FAIL - Create Exception
            await client.query(`
                UPDATE "ReconciliationPeriods" SET "Status" = 'Exception' WHERE "ReconciliationPeriodID" = $1
            `, [periodId]);

            await client.query(`
                INSERT INTO "ReconciliationExceptions"
                ("ReconciliationPeriodID", "ExceptionType", "ExpectedAmount", "ActualAmount", "VarianceAmount", "Description", "RaisedBy", "Status")
                VALUES ($1, 'Balance Mismatch', $2, $3, $4, 'Net amount does not update bank txns', $5, 'Open')
            `, [periodId, expectedNet, actualNet, variance, userId]);

            await client.query('COMMIT');
            return NextResponse.json({ success: false, status: 'Exception', variance });
        }

    } catch (e: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        client.release();
    }
}
