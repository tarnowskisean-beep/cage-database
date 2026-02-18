
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const { transactions } = await req.json();

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json({ error: 'No transactions provided' }, { status: 400 });
        }

        console.log(`[Bank Import] Processing ${transactions.length} items for Period ${id}`);

        // 0. Fetch ClientID for this Period (Required by Schema)
        const periodRes = await query('SELECT "ClientID" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1', [id]);
        if (periodRes.rows.length === 0) {
            return NextResponse.json({ error: 'Period not found' }, { status: 404 });
        }
        const clientID = periodRes.rows[0].ClientID;

        let importedCount = 0;
        let matchedCount = 0;

        // Fetch Potential Matches (Open Batches)
        // Optimization: Fetch all candidate batches once
        // Candidates: Status Closed/Submitted, not already matched? (Can't easily check "not matched" without join, but it's fine)
        const batchesRes = await query(`
            SELECT "BatchID", "Date", "PaymentCategory" as "Type", "BatchCode",
            (SELECT SUM("GiftAmount" - COALESCE("GiftFee", 0)) FROM "Donations" WHERE "Donations"."BatchID" = "Batches"."BatchID") as "Amount"
            FROM "Batches" 
            WHERE "Status" IN ('Closed', 'Submitted')
            AND "Cleared" = false
        `);
        const candidateBatches = batchesRes.rows.map(b => ({
            ...b,
            Amount: parseFloat(b.Amount || '0'),
            DateObj: new Date(b.Date)
        }));

        for (const tx of transactions) {
            const txAmount = parseFloat(tx.Amount);
            const txDate = new Date(tx.Date);
            
            // Determine AmountIn/Out and Type
            let amountIn = 0;
            let amountOut = 0;
            let type = 'Unknown';
            
            if (txAmount > 0) {
                amountIn = txAmount;
                type = 'Deposit';
            } else {
                amountOut = Math.abs(txAmount);
                type = 'Withdrawal';
            }

            // 1. Insert Transaction
            // Schema: TransactionID, ReconciliationPeriodID, ClientID, TransactionDate, TransactionType, AmountIn, AmountOut, Description, ReferenceNumber, Status, StatementImported, CreatedAt
            const insertRes = await query(`
                INSERT INTO "ReconciliationBankTransactions" 
                ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountIn", "AmountOut", "Description", "ReferenceNumber", "Status", "StatementImported", "CreatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Unmatched', true, NOW())
                RETURNING "TransactionID"
            `, [id, clientID, tx.Date, type, amountIn, amountOut, tx.Description, tx.Reference]);

            const txId = insertRes.rows[0].TransactionID;
            importedCount++;

            // 2. Auto-Match Logic
            if (amountIn > 0) {
                // Look for DEPOSIT (Batch)
                const matches = candidateBatches.filter(b => {
                    // Exact Amount Match (Compare against AmountIn)
                    if (Math.abs(b.Amount - amountIn) > 0.01) return false;

                    // Date Buffer (+/- 5 days)
                    const diffTime = Math.abs(txDate.getTime() - b.DateObj.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 5;
                });

                if (matches.length === 1) {
                    // Found single exact match! Link it.
                    const batch = matches[0];
                    await query(`
                        UPDATE "ReconciliationBankTransactions"
                        SET "MatchedBatchID" = $1, "Status" = 'Matched'
                        WHERE "TransactionID" = $2
                    `, [batch.BatchID, txId]);

                    matchedCount++;
                }
            } else {
                // Payment/Debit - Look for Fees/Refunds?
                // Logic TBD
            }
        }

        return NextResponse.json({ success: true, imported: importedCount, matched: matchedCount });

    } catch (e: any) {
        console.error('Import Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
