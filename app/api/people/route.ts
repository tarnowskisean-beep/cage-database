
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
    const minParam = searchParams.get('min');
    const cityParam = searchParams.get('city');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        let sql = `
            SELECT 
                d."DonorID", d."FirstName", d."LastName", d."Email", d."Phone", d."City", d."State",
                COUNT(don."DonationID") as "TotalGifts",
                COALESCE(SUM(don."GiftAmount"), 0) as "LifetimeValue",
                MAX(don."GiftDate") as "LastGiftDate"
            FROM "Donors" d
            LEFT JOIN "Donations" don ON d."DonorID" = don."DonorID"
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (q) {
            params.push(`%${q}%`);
            sql += ` AND (d."FirstName" ILIKE $${paramIdx} OR d."LastName" ILIKE $${paramIdx} OR d."Email" ILIKE $${paramIdx})`;
            paramIdx++;
        }

        if (cityParam) {
            params.push(`%${cityParam}%`);
            sql += ` AND d."City" ILIKE $${paramIdx}`;
            paramIdx++;
        }

        sql += ` GROUP BY d."DonorID"`;

        if (minParam) {
            params.push(parseFloat(minParam));
            sql += ` HAVING COALESCE(SUM(don."GiftAmount"), 0) >= $${paramIdx}`;
            paramIdx++;
        }

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
