
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// GET /api/reconciliation/periods/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        // 1. Fetch Period Info
        const periodRes = await query(`
            SELECT 
                p.*,
                c."ClientName"
            FROM "ReconciliationPeriods" p
            JOIN "Clients" c ON p."ClientID" = c."ClientID"
            WHERE "ReconciliationPeriodID" = $1
        `, [id]);

        if (periodRes.rows.length === 0) return NextResponse.json({ error: 'Period not found' }, { status: 404 });
        const period = periodRes.rows[0];

        // 2. Fetch Money In (Batches)
        // We aggregate from Donations? Or use ReconciliationBatchDetails?
        // QB Style needs INDIVIDUAL line items of batches.
        // We need to fetch batches linked to this period. 
        // Wait, our current schema aggregates everything into `ReconciliationBatchDetails`.
        // To support "Check off this batch", we need to know WHICH batches are in this period.
        // Current schema limitation: We don't have a `ReconciliationPeriodID` on the `Batches` table. 
        // We only updated totals.
        // FIX: We need to query Batches by Date Range of the Period? Or add a Link Column.
        // Spec said "Any batch dated in this week".
        // Let's query Batches by Date Range + Status=Closed.

        const batchesRes = await query(`
            SELECT "BatchID", "Date", "BatchCode", "PaymentCategory"
            FROM "Batches"
            WHERE "ClientID" = $1 
            AND "Date" >= $2 AND "Date" <= $3
            AND "Status" = 'Closed'
            ORDER BY "Date" ASC
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);

        // Calculate Batch Totals dynamically for display
        // (In production, cache this or store link)
        const batches = [];
        for (const b of batchesRes.rows) {
            const sum = await query('SELECT SUM("GiftAmount") as total FROM "Donations" WHERE "BatchID"=$1', [b.BatchID]);
            batches.push({
                id: b.BatchID,
                type: 'Batch',
                desc: `${b.BatchCode} (${b.PaymentCategory})`,
                amount: parseFloat(sum.rows[0].total || 0),
                date: b.Date
            });
        }

        // 3. Fetch Money Out (Fees, Transfers)
        // Fees are tricky. They are attached to donations.
        // Transfers are in ReconciliationBankTransactions (TransactionType='Transfer Out', etc.)
        const txnsRes = await query(`
            SELECT "TransactionID", "TransactionDate", "Description", "AmountOut", "AmountIn"
            FROM "ReconciliationBankTransactions"
            WHERE "ReconciliationPeriodID" = $1
            ORDER BY "TransactionDate" ASC
        `, [id]);

        const payments = txnsRes.rows.map(t => ({
            id: t.TransactionID,
            type: t.AmountOut > 0 ? 'Payment' : 'Deposit',
            desc: t.Description,
            amount: t.AmountOut > 0 ? -parseFloat(t.AmountOut) : parseFloat(t.AmountIn),
            date: t.TransactionDate
        }));

        const result = {
            ...period,
            batches,
            payments
        };

        return NextResponse.json(result);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PATCH /api/reconciliation/periods/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    try {
        // Update fields
        const { StatementEndingBalance, StatementLink } = body;

        const updates = [];
        const values = [id];
        let idx = 2;

        if (StatementEndingBalance !== undefined) {
            updates.push(`"StatementEndingBalance" = $${idx++}`);
            values.push(StatementEndingBalance);
        }
        if (StatementLink !== undefined) {
            updates.push(`"StatementLink" = $${idx++}`);
            values.push(StatementLink);
        }

        if (updates.length > 0) {
            await query(`
                UPDATE "ReconciliationPeriods"
                SET ${updates.join(', ')}
                WHERE "ReconciliationPeriodID" = $1
            `, values);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
