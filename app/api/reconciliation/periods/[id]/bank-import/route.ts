
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { transaction } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fix: Await params
    const { id: periodId } = await params;

    const body = await req.json();
    const { transactions, clientId } = body;

    if (!transactions || !Array.isArray(transactions)) {
        return NextResponse.json({ error: 'Invalid transactions array' }, { status: 400 });
    }


    try {
        const result = await transaction(async (client) => {
            let matchedCount = 0;
            let importedCount = 0;

            const periodRes = await client.query(`SELECT "TotalPeriodAmount", "PeriodStartDate", "PeriodEndDate", "ClientID" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
            if (periodRes.rows.length === 0) throw new Error('Period not found');
            const period = periodRes.rows[0];

            for (const txn of transactions) {
                const amountIn = parseFloat(txn.amountIn || 0);
                const amountOut = parseFloat(txn.amountOut || 0);
                const txnDate = new Date(txn.date);

                let isMatched = false;

                // 1. MATCHING LOGIC
                if (amountIn > 0) {
                    // DEPOSIT: Look for a Batch with same amount +/- 0.01 within +/- 3 days
                    // We need to query Batches that are 'Closed' and not already cleared? 
                    // Ideally not already cleared, but maybe we are re-running.
                    // Let's just look for one that fits.

                    const dateLower = new Date(txnDate); dateLower.setDate(dateLower.getDate() - 3);
                    const dateUpper = new Date(txnDate); dateUpper.setDate(dateUpper.getDate() + 3);

                    // We need to sum donations for batches to get the amount? 
                    // No, that's expensive inside a loop.
                    // Better approach: We should have cached batch totals or query efficiently.
                    // For MPV/Speed: Let's find batches in date range first, then check amounts.

                    // Actually, we can use the backend logic we used in GET to fetch batches + totals?
                    // Or just do a join.
                    const potentialBatches = await client.query(`
                        SELECT b."BatchID", SUM(d."GiftAmount") as "Total"
                        FROM "Batches" b
                        JOIN "Donations" d ON b."BatchID" = d."BatchID"
                        WHERE b."ClientID" = $1
                        AND b."Status" = 'Closed'
                        AND b."Date" >= $2 AND b."Date" <= $3
                        AND b."Cleared" = FALSE 
                        GROUP BY b."BatchID"
                    `, [period.ClientID, dateLower, dateUpper]);

                    for (const batch of potentialBatches.rows) {
                        const batchTotal = parseFloat(batch.Total);
                        if (Math.abs(batchTotal - amountIn) < 0.02) {
                            // MATCH FOUND!
                            // 1. Mark Batch as Cleared
                            await client.query(`UPDATE "Batches" SET "Cleared" = TRUE WHERE "BatchID" = $1`, [batch.BatchID]);
                            isMatched = true;
                            break; // Stop looking for matches for this line
                        }
                    }

                } else if (amountOut > 0) {
                    // WITHDRAWAL: Look for manual transactions (Transfers, Fees)
                    // "StatementImported" = FALSE means it was systematically added or manually added
                    const potentialTxns = await client.query(`
                        SELECT "TransactionID", "AmountOut"
                        FROM "ReconciliationBankTransactions"
                        WHERE "ReconciliationPeriodID" = $1
                        AND "StatementImported" = FALSE
                        AND "Cleared" = FALSE
                        AND "AmountOut" > 0
                    `, [periodId]);

                    for (const sysTxn of potentialTxns.rows) {
                        // Check amount match
                        if (Math.abs(parseFloat(sysTxn.AmountOut) - amountOut) < 0.02) {
                            // Match!
                            await client.query(`UPDATE "ReconciliationBankTransactions" SET "Cleared" = TRUE WHERE "TransactionID" = $1`, [sysTxn.TransactionID]);
                            isMatched = true;
                            break;
                        }
                    }
                }

                if (isMatched) matchedCount++;

                // 2. INSERT STATEMENT RECORD
                // If it matched, we mark THIS imported record as "Matched" (so we can visually dim it or hide it)
                // In QB, matched bank lines disappear from the "To Match" list.
                // For us, we'll store it as "Matched=TRUE"

                await client.query(`
                    INSERT INTO "ReconciliationBankTransactions"
                    ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountIn", "AmountOut", "Description", "ReferenceNumber", "StatementImported", "Matched")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
                `, [
                    periodId,
                    period.ClientID, // Use Period's ClientID (safer)
                    txn.date,
                    txn.type || (amountIn > 0 ? 'Deposit' : 'Withdrawal'),
                    amountIn,
                    amountOut,
                    txn.description,
                    txn.ref,
                    isMatched
                ]);

                importedCount++;
            }
            return { importedCount, matchedCount };
        });

        return NextResponse.json({ success: true, imported: result.importedCount, matched: result.matchedCount });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
