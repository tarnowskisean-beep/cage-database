import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Total Revenue
        const revenueRes = await query('SELECT SUM(GiftAmount) as total FROM Donations');
        const totalRevenue = revenueRes.rows[0]?.total || 0;

        // 2. Revenue by Client
        const clientRes = await query(`
            SELECT c.ClientName, SUM(d.GiftAmount) as total 
            FROM Donations d 
            JOIN Clients c ON d.ClientID = c.ClientID 
            GROUP BY c.ClientName
            ORDER BY total DESC
        `);

        // 3. Donations by Payment Method
        const methodRes = await query(`
            SELECT GiftMethod, COUNT(*) as count, SUM(GiftAmount) as total 
            FROM Donations 
            GROUP BY GiftMethod
        `);

        // 4. Donations by Platform
        const platformRes = await query(`
            SELECT GiftPlatform, COUNT(*) as count, SUM(GiftAmount) as total 
            FROM Donations 
            GROUP BY GiftPlatform
        `);

        return NextResponse.json({
            totalRevenue,
            byClient: clientRes.rows,
            byMethod: methodRes.rows,
            byPlatform: platformRes.rows
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
