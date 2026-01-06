
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

        // 5. Get Last Contact (from Notes)
        const notesRes = await query(`
            SELECT MAX("CreatedAt") as "LastContact" FROM "DonorNotes" WHERE "DonorID" = $1
        `, [id]);
        const lastContact = notesRes.rows[0]?.LastContact || null;

        // 6. Get Subscription Status
        const subRes = await query(`
            SELECT 1 FROM "DonorSubscriptions" WHERE "UserID" = $1 AND "DonorID" = $2
        `, [session.user.id || (session.user as any).UserID, id]); // Handle both session formats if needed, usually session.user.id is string from next-auth
        const isSubscribed = subRes.rows.length > 0;

        return NextResponse.json({
            profile: donor,
            stats: {
                totalGiven,
                giftCount,
                avgGift,
                lastContact
            },
            history: history,
            pledges: pledges,
            isSubscribed
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
