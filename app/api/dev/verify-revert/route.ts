
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        console.log('[Verify] Testing Revert Logic...');

        const testSource = 'TestRevertSystem';

        // 1. SETUP: Create Session
        const sessionRes = await query(`
            INSERT INTO "import_sessions" ("filename", "source_system", "status", "created_by")
            VALUES ($1, $2, 'Processing', 1)
            RETURNING "id"
        `, ['revert_test.csv', testSource]);
        const sessionId = sessionRes.rows[0].id;

        // 2. SETUP: Create Batch & Donation linked to Session
        // We simulate what the Commit API does
        const batchRes = await query(`
            INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "CreatedBy", "ImportSessionID")
            VALUES ('TEST.REVERT.001', 1, 'Import', 'Donations', 1, $1)
            RETURNING "BatchID"
        `, [sessionId]); // Assuming ClientID 1 exists
        const batchId = batchRes.rows[0].BatchID;

        const donRes = await query(`
            INSERT INTO "Donations" ("ClientID", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "BatchID", "ImportSessionID")
            VALUES (1, 100.00, 'Check', 'Test', NOW(), $1, $2)
            RETURNING "DonationID"
        `, [batchId, sessionId]);
        const donationId = donRes.rows[0].DonationID;

        // Verify Data Exists
        console.log(`Created Session ${sessionId}, Batch ${batchId}, Donation ${donationId}`);

        // 3. ACTION: Execute Revert Logic (Mirrors /api/import/revert/[id])
        // Step A: Delete Donations
        const delDonations = await query(`DELETE FROM "Donations" WHERE "ImportSessionID" = $1`, [sessionId]);
        const delDonationsBatch = await query(`DELETE FROM "Donations" WHERE "BatchID" = $1`, [batchId]);

        // Step B: Delete Batches
        const delBatches = await query(`DELETE FROM "Batches" WHERE "ImportSessionID" = $1`, [sessionId]);

        // Step C: Update Session
        await query(`UPDATE "import_sessions" SET "status" = 'Reverted' WHERE "id" = $1`, [sessionId]);

        // 4. VERIFY
        const checkDonation = await query(`SELECT * FROM "Donations" WHERE "DonationID" = $1`, [donationId]);
        const checkBatch = await query(`SELECT * FROM "Batches" WHERE "BatchID" = $1`, [batchId]);
        const checkSession = await query(`SELECT "status" FROM "import_sessions" WHERE "id" = $1`, [sessionId]);

        const success = (checkDonation.rows.length === 0) && (checkBatch.rows.length === 0) && (checkSession.rows[0].status === 'Reverted');

        return NextResponse.json({
            success,
            message: success ? 'Revert Logic Verified: Data Deleted' : 'Revert Failed',
            details: {
                donationsDeleted: delDonations.rowCount,
                batchesDeleted: delBatches.rowCount,
                donationStillExists: checkDonation.rows.length > 0,
                batchStillExists: checkBatch.rows.length > 0
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
