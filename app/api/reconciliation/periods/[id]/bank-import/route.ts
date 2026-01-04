
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { pool } from '../../../../lib/db';

// POST /api/reconciliation/periods/[id]/bank-import
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const periodId = params.id;
    const body = await req.json();
    const { transactions, clientId } = body;
    // transactions: Array<{ date, type, amountIn, amountOut, description, ref }>

    if (!transactions || !Array.isArray(transactions)) {
        return NextResponse.json({ error: 'Invalid transactions array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let matchedCount = 0;
        let importedCount = 0;

        // Get Period details for matching logic
        const periodRes = await client.query(`SELECT "TotalPeriodAmount", "PeriodStartDate", "PeriodEndDate" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
        const period = periodRes.rows[0];

        for (const txn of transactions) {
            // 1. Insert Transaction
            const res = await client.query(`
                INSERT INTO "ReconciliationBankTransactions"
                ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountIn", "AmountOut", "Description", "ReferenceNumber", "StatementImported")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
                RETURNING "TransactionID"
            `, [
                periodId,
                clientId,
                txn.date,
                txn.type || (txn.amountIn > 0 ? 'Deposit' : 'Withdrawal'),
                txn.amountIn || 0,
                txn.amountOut || 0,
                txn.description,
                txn.ref
            ]);
            const txnId = res.rows[0].TransactionID;
            importedCount++;

            // 2. Auto-Match Logic
            // If it's a Deposit and Amount matches Period Total (within $1.00 tolerance per spec), MATCH IT.
            // Simplified logic: If amountIn ~= PeriodTotal
            const delta = Math.abs((txn.amountIn || 0) - parseFloat(period.TotalPeriodAmount));
            if ((txn.amountIn > 0) && delta < 1.00) {
                await client.query(`UPDATE "ReconciliationBankTransactions" SET "Matched" = TRUE WHERE "TransactionID" = $1`, [txnId]);
                matchedCount++;
            }
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, imported: importedCount, matched: matchedCount });

    } catch (e: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        client.release();
    }
}
