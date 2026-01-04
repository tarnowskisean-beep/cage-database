
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        let sql = `
            SELECT 
                d."DonorID", d."FirstName", d."LastName", d."Email", d."Phone", d."City", d."State",
                COUNT(don."DonationID") as "TotalGifts",
                SUM(don."GiftAmount") as "LifetimeValue",
                MAX(don."GiftDate") as "LastGiftDate"
            FROM "Donors" d
            LEFT JOIN "Donations" don ON d."DonorID" = don."DonorID"
            WHERE 1=1
        `;
        const params: any[] = [];

        if (q) {
            params.push(`%${q}%`);
            sql += ` AND (d."FirstName" ILIKE $1 OR d."LastName" ILIKE $1 OR d."Email" ILIKE $1)`;
        }

        sql += ` GROUP BY d."DonorID"`;
        sql += ` ORDER BY "LifetimeValue" DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;

        const res = await query(sql, params);

        // Count for pagination
        // (Simplified count for speed, ideally we count total matching rows)
        // const countRes = await query(`SELECT COUNT(*) FROM "Donors" d WHERE ...`); 

        return NextResponse.json({
            data: res.rows,
            page,
            hasMore: res.rows.length === limit
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
