
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        // 1. Get Donor Profile
        const donorRes = await query(`
            SELECT * FROM "Donors" WHERE "DonorID" = $1
        `, [id]);

        if (donorRes.rows.length === 0) return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
        const donor = donorRes.rows[0];

        // 2. Get Donation History
        const historyRes = await query(`
            SELECT 
                "DonationID", "GiftDate", "GiftAmount", "GiftMethod", "GiftPlatform", 
                "BatchID", "CheckNumber", "MailCode",
                c."ClientName", c."ClientCode"
            FROM "Donations" d
            LEFT JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE "DonorID" = $1
            ORDER BY "GiftDate" DESC
        `, [id]);

        const history = historyRes.rows;

        // 3. Get Pledges & Calculate Progress
        const pledgesRes = await query(`
            SELECT * FROM "Pledges" WHERE "DonorID" = $1 ORDER BY "CreatedAt" DESC
        `, [id]);

        const pledges = pledgesRes.rows.map(pledge => {
            const donated = history
                .filter(h => h.MailCode === pledge.MailCode)
                .reduce((sum, h) => sum + Number(h.GiftAmount), 0);
            return {
                ...pledge,
                donated,
                progress: pledge.Amount > 0 ? (donated / pledge.Amount) * 100 : 0
            };
        });

        // 4. Calculate Stats
        const totalGiven = history.reduce((acc, row) => acc + parseFloat(row.GiftAmount || 0), 0);
        const giftCount = history.length;
        const avgGift = giftCount > 0 ? totalGiven / giftCount : 0;

        return NextResponse.json({
            profile: donor,
            stats: {
                totalGiven,
                giftCount,
                avgGift
            },
            history: history,
            pledges: pledges
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
