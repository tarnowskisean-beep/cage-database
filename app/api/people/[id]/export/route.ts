
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const donorRes = await query(`SELECT * FROM "Donors" WHERE "DonorID" = $1`, [id]);
        if (donorRes.rows.length === 0) return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
        const donor = donorRes.rows[0];

        const donationsRes = await query(`
            SELECT d."GiftDate", d."GiftAmount", d."CheckNumber", d."GiftMethod", d."GiftPlatform", c."ClientCode"
            FROM "Donations" d
            LEFT JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE d."DonorID" = $1
            ORDER BY d."GiftDate" DESC
        `, [id]);

        // Generate CSV manually (simple enough)
        const headers = ['Date', 'Client', 'Amount', 'Method', 'Platform', 'Check Number'];
        const rows = donationsRes.rows.map(d => [
            new Date(d.GiftDate).toLocaleDateString(),
            d.ClientCode || '',
            d.GiftAmount,
            d.GiftMethod || '',
            d.GiftPlatform || '',
            d.CheckNumber || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="history_${donor.FirstName}_${donor.LastName}.csv"`
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
