
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const params: any[] = [];
        let whereClause = '';
        let paramIdx = 1;

        // Client Access Control
        if ((session.user as any).role === 'ClientUser') {
            const allowedIds: number[] = (session.user as any).allowedClientIds || [];
            if (allowedIds.length > 0) {
                params.push(allowedIds);
                whereClause = `AND d."ClientID" = ANY($${paramIdx})`;
                paramIdx++;
            } else {
                return NextResponse.json({ review: 0, acknowledgements: 0 });
            }
        }

        // 1. Count Pending Resolutions
        const resolutionRes = await query(`
            SELECT COUNT(*) as count 
            FROM "Donations" d 
            WHERE d."ResolutionStatus" = 'Pending'
            ${whereClause}
        `, params);

        // 2. Count Outstanding Acknowledgements
        // Logic: Amount > 50, Batch Closed/Reconciled, ThankYouSentAt IS NULL
        // Note: Joining Batches is required to check Batch Status
        // WhereClause applies to 'd' (Donations), so it fits.
        const ackRes = await query(`
            SELECT COUNT(*) as count
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            WHERE d."GiftAmount" > 50
            AND b."Status" IN ('Closed', 'Reconciled')
            AND d."ThankYouSentAt" IS NULL
            ${whereClause}
        `, params);

        // 3. Count Flagged Alerts
        const alertsRes = await query(`
            SELECT COUNT(*) as count 
            FROM "Donations" d 
            WHERE d."IsFlagged" = TRUE
            ${whereClause}
        `, params);

        // 4. Count Total Directory (Unique Donors)
        // Using Email as primary unifier for approximate count
        const directoryRes = await query(`
            SELECT COUNT(DISTINCT "DonorEmail") as count 
            FROM "Donations" d 
            WHERE 1=1
            ${whereClause}
        `, params);

        return NextResponse.json({
            review: parseInt(resolutionRes.rows[0].count),
            acknowledgements: parseInt(ackRes.rows[0].count),
            alerts: parseInt(alertsRes.rows[0].count),
            directory: parseInt(directoryRes.rows[0].count)
        });

    } catch (e: any) {
        console.error('People Stats API Error:', e);
        return NextResponse.json({ review: 0, acknowledgements: 0 }, { status: 500 });
    }
}
