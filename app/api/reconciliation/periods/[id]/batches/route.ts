
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { transaction } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: periodId } = await params;
    const body = await req.json();
    const { batchId } = body;

    if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });

    try {
        await transaction(async (client) => {
            // 1. Verify Period is Open
            const periodRes = await client.query(`SELECT "Status" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
            if (periodRes.rows.length === 0) throw new Error('Period not found');
            if (periodRes.rows[0].Status !== 'Open' && periodRes.rows[0].Status !== 'Pending Reconciliation') {
                throw new Error('Period is processed/locked. Cannot add batch.');
            }

            // 2. Verify Batch is Closed
            const batchRes = await client.query(`SELECT "Status", "BatchID" FROM "Batches" WHERE "BatchID" = $1`, [batchId]);
            if (batchRes.rows.length === 0) throw new Error('Batch not found');
            if (batchRes.rows[0].Status !== 'Closed') throw new Error('Batch must be CLOSED to reconcile.');

            // 3. Aggregation Logic
            const summaryRes = await client.query(`
                SELECT 
                    "GiftMethod",
                    COUNT(*) as count,
                    SUM("GiftAmount") as amount,
                    SUM("GiftFee") as fees,
                    SUM(CASE WHEN "GiftAmount" < 0 THEN "GiftAmount" ELSE 0 END) as chargebacks
                FROM "Donations"
                WHERE "BatchID" = $1
                GROUP BY "GiftMethod"
            `, [batchId]);

            let batchTotal = 0;

            const updates: any = {
                checksVal: 0, checksCount: 0,
                cashVal: 0, cashCount: 0,
                stripeVal: 0, stripeCount: 0,
                stripeFees: 0,
                chargebacksVal: 0
            };

            for (const row of summaryRes.rows) {
                const method = row.GiftMethod;
                const amt = parseFloat(row.amount);
                const cnt = parseInt(row.count);
                const fee = parseFloat(row.fees || 0);

                batchTotal += amt;

                if (row.GiftAmount < 0) {
                    updates.chargebacksVal += Math.abs(amt);
                } else {
                    if (method === 'Check') { updates.checksVal += amt; updates.checksCount += cnt; }
                    else if (method === 'Cash') { updates.cashVal += amt; updates.cashCount += cnt; }
                    else if (method === 'Credit Card' || method === 'CC') {
                        updates.stripeVal += amt;
                        updates.stripeCount += cnt;
                        updates.stripeFees += fee;
                    }
                }
            }

            // 4. Update ReconciliationBatchDetails
            await client.query(`
                UPDATE "ReconciliationBatchDetails"
                SET 
                    "NumChecks" = "NumChecks" + $2,
                    "AmountChecks" = "AmountChecks" + $3,
                    "NumCash" = "NumCash" + $4,
                    "AmountCash" = "AmountCash" + $5,
                    "NumCCStripe" = "NumCCStripe" + $6,
                    "AmountCCStripe" = "AmountCCStripe" + $7,
                    "AmountStripeFees" = "AmountStripeFees" + $8,
                    "AmountCheckChargebacks" = "AmountCheckChargebacks" + $9,
                    
                    "NumDonorIncoming" = "NumDonorIncoming" + ($2 + $4 + $6),
                    "AmountDonorIncoming" = "AmountDonorIncoming" + ($3 + $5 + $7),
                    "AmountDonorNet" = "AmountDonorNet" + ( ($3 + $5 + $7) - $8 - $9 )
                WHERE "ReconciliationPeriodID" = $1
            `, [
                periodId,
                updates.checksCount, updates.checksVal,
                updates.cashCount, updates.cashVal,
                updates.stripeCount, updates.stripeVal,
                updates.stripeFees,
                updates.chargebacksVal
            ]);

            // 5. Update Period Total
            await client.query(`
                UPDATE "ReconciliationPeriods"
                SET "TotalPeriodAmount" = "TotalPeriodAmount" + $2
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId, batchTotal]);

            // 6. Verify Chargeback Note
            const cbCheck = await client.query(`SELECT "AmountCheckChargebacks" + "AmountCCStripeChargebacks" as cbTotal FROM "ReconciliationBatchDetails" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
            const cbTotal = parseFloat(cbCheck.rows[0].cbtotal || 0);
            const note = cbTotal > 0 ? `$${cbTotal.toFixed(2)} in chargebacks.` : '$0.00 in chargebacks.';

            await client.query(`UPDATE "ReconciliationPeriods" SET "Notes" = $2 WHERE "ReconciliationPeriodID" = $1`, [periodId, note]);
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
