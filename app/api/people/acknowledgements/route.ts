
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    try {
        let sql = `
            SELECT 
                d."DonationID", d."GiftDate", d."GiftAmount", d."GiftMethod", d."CampaignID", d."Comment",
                don."DonorID", don."FirstName", don."LastName", don."Email",
                don."Address", don."City", don."State", don."Zip"
            FROM "Donations" d
            JOIN "Donors" don ON d."DonorID" = don."DonorID"
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            WHERE d."ThankYouSentAt" IS NULL
            AND d."GiftAmount" > 50
            AND b."Status" IN ('Closed', 'Reconciled')
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // Client Access Control
        if ((session.user as any).role === 'ClientUser') {
            const allowedIds: number[] = (session.user as any).allowedClientIds || [];
            if (allowedIds.length > 0) {
                params.push(allowedIds);
                sql += ` AND d."ClientID" = ANY($${paramIdx})`;
                paramIdx++;
            } else {
                return NextResponse.json([]);
            }
        }

        if (start) {
            params.push(start);
            sql += ` AND d."GiftDate" >= $${paramIdx}`;
            paramIdx++;
        }
        if (end) {
            params.push(end);
            sql += ` AND d."GiftDate" <= $${paramIdx}`;
            paramIdx++;
        }

        sql += ` ORDER BY d."GiftDate" ASC LIMIT 500`;

        const res = await query(sql, params);
        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
