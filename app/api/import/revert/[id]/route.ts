
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAction } from "@/lib/audit";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionId = params.id;

        // Verify Session Exists
        const sessionCheck = await query('SELECT * FROM "import_sessions" WHERE "id" = $1', [sessionId]);
        if (sessionCheck.rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        const impSession = sessionCheck.rows[0];

        // Perform Revert
        // 1. Delete Donations linked to this Session (or its Batches)
        // Since we link Batches to the Session, we can delete via Batch linkage or direct linkage.
        // Let's use direct ImportSessionID if available, OR join via Batches.

        // Delete Donations where ImportSessionID matches
        const delDonationsDirect = await query(`DELETE FROM "Donations" WHERE "ImportSessionID" = $1 RETURNING "DonationID"`, [sessionId]);

        // Delete Donations belonging to Batches created by this session
        const delDonationsBatch = await query(`
            DELETE FROM "Donations" 
            WHERE "BatchID" IN (SELECT "BatchID" FROM "Batches" WHERE "ImportSessionID" = $1)
            RETURNING "DonationID"
        `, [sessionId]);

        // 2. Delete Batches
        const delBatches = await query(`DELETE FROM "Batches" WHERE "ImportSessionID" = $1 RETURNING "BatchID"`, [sessionId]);

        // 3. Clear Staging (Optional, maybe keep for debug? But "Backout" implies undoing commit)
        // We do NOT delete the session record, just mark it.

        await query(`UPDATE "import_sessions" SET "status" = 'Reverted' WHERE "id" = $1`, [sessionId]);

        const count = (delDonationsDirect.rowCount || 0) + (delDonationsBatch.rowCount || 0);

        // Log Audit
        await logAction(
            (session.user as any).id,
            'RevertImport',
            String(sessionId),
            `Reverted Import Session ${sessionId}. Deleted ${count} donations and ${delBatches.rowCount} batches.`
        );

        return NextResponse.json({
            success: true,
            deletedDonations: count,
            deletedBatches: delBatches.rowCount
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
