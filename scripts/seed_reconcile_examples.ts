
import { query } from '../lib/db';

async function seedExamples() {
    try {
        console.log('🔍 Finding active Reconciliation Period...');
        // Find most recent open period
        const periodRes = await query(`
            SELECT "ReconciliationPeriodID", "ClientID" 
            FROM "ReconciliationPeriods" 
            ORDER BY "CreatedAt" DESC 
            LIMIT 1
        `);

        if (periodRes.rows.length === 0) {
            console.log('❌ No active period found. Please go to /reconciliation and create one first.');
            return;
        }

        const periodId = periodRes.rows[0].ReconciliationPeriodID;
        console.log(`✅ Found Period ID: ${periodId}. Seeding examples...`);

        // 1. Unmatched Deposit (For + Batch testing)
        // Date: Today
        await query(`
            INSERT INTO "ReconciliationBankTransactions" 
            ("ReconciliationPeriodID", "ClientID", "TransactionDate", "Description", "AmountIn", "AmountOut", "Status", "ReferenceNumber", "TransactionType", "CreatedAt")
            VALUES ($1, $2, NOW(), 'Mobile Deposit - Unmatched', 250.00, 0, 'Unmatched', 'REF-MOBILE-01', 'Credit', NOW())
        `, [periodId, periodRes.rows[0].ClientID]);

        // 2. Unmatched Expense (Service Fee)
        await query(`
            INSERT INTO "ReconciliationBankTransactions" 
            ("ReconciliationPeriodID", "ClientID", "TransactionDate", "Description", "AmountIn", "AmountOut", "Status", "ReferenceNumber", "TransactionType", "CreatedAt")
            VALUES ($1, $2, NOW(), 'Monthly Service Fee', 0, 15.00, 'Unmatched', 'BANK-FEE', 'Debit', NOW())
        `, [periodId, periodRes.rows[0].ClientID]);

        // 3. Matched Item (Simulated)
        // Insert a dummy batch first to match against
        const batchRes = await query(`
            INSERT INTO "Batches" ("ClientID", "BatchCode", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
            VALUES ($1, 'AUTO.MATCH.TEST.01', 'Manual', 'Checks', 'Open', 1, NOW())
            RETURNING "BatchID"
        `, [periodRes.rows[0].ClientID]);
        const batchId = batchRes.rows[0].BatchID;

        await query(`
            INSERT INTO "ReconciliationBankTransactions" 
            ("ReconciliationPeriodID", "ClientID", "TransactionDate", "Description", "AmountIn", "AmountOut", "Status", "ReferenceNumber", "MatchedBatchID", "TransactionType", "CreatedAt")
            VALUES ($1, $2, NOW(), 'Deposit - Check #999', 100.00, 0, 'Matched', 'CHK-999', $3, 'Credit', NOW())
        `, [periodId, periodRes.rows[0].ClientID, batchId]);

        console.log('🎉 Examples Seeded! Refresh the Reconciliation page.');

    } catch (e) {
        console.error('Error seeding examples:', e);
    }
}

seedExamples();
