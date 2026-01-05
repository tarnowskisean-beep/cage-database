
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// GET /api/reconciliation/periods/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    console.log(`[Reconciliation API] Fetching Period ID: ${id}`); // DEBUG LOG

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
            SELECT "BatchID", "Date", "BatchCode", "PaymentCategory", "Cleared"
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
                date: b.Date,
                cleared: b.Cleared || false
            });
        }

        // 3. Fetch Money Out (Fees, Refunds, Chargebacks)
        // REPLACED: Fetching from Donations table instead of ReconciliationBankTransactions

        // A. Refunds & Chargebacks
        const refundsRes = await query(`
            SELECT "DonationID", "GiftDate", "GiftAmount", "TransactionType", "DonorID", "BatchID"
            FROM "Donations"
            WHERE "ClientID" = $1
            AND "GiftDate" >= $2 AND "GiftDate" <= $3
            AND "TransactionType" IN ('Refund', 'Chargeback', 'Void')
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);

        // B. Fees (Associated with Donations in this period)
        // Note: Fees usually happen same day as gift.
        const feesRes = await query(`
            SELECT "DonationID", "GiftDate", "GiftFee", "TransactionType"
            FROM "Donations"
            WHERE "ClientID" = $1
            AND "GiftDate" >= $2 AND "GiftDate" <= $3
            AND "GiftFee" > 0
        `, [period.ClientID, period.PeriodStartDate, period.PeriodEndDate]);

        const payments = [];

        // Add Refunds/Chargebacks
        for (const r of refundsRes.rows) {
            payments.push({
                id: `REF-${r.DonationID}`, // Virtual ID to distinguish
                type: 'Payment',
                desc: `${r.TransactionType} #${r.DonationID}`,
                amount: Math.abs(parseFloat(r.GiftAmount)), // Amount is negative in DB usually? Or positive? Assuming we need positive for "Money Out" display logic which flips it.
                date: r.GiftDate,
                cleared: false // TODO: Persist cleared status for these virtual items? Currently transient.
            });
        }

        // Add Fees
        for (const f of feesRes.rows) {
            payments.push({
                id: `FEE-${f.DonationID}`, // Virtual ID
                type: 'Payment',
                desc: `Processing Fee (Tx #${f.DonationID})`,
                amount: parseFloat(f.GiftFee),
                date: f.GiftDate,
                cleared: false
            });
        }

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
