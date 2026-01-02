import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build dynamic WHERE clause
        const conditions: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (clientId) {
            conditions.push(`d."ClientID" = $${paramIndex++}`);
            params.push(clientId);
        }
        if (startDate) {
            conditions.push(`d."GiftDate" >= $${paramIndex++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`d."GiftDate" <= $${paramIndex++}`);
            // Append end of day time if needed, assuming just date string YYYY-MM-DD
            params.push(`${endDate} 23:59:59`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 1. Total Revenue
        const revenueRes = await query(`SELECT SUM(d."GiftAmount") as total FROM "Donations" d ${whereClause}`, params);
        const totalRevenue = revenueRes.rows[0]?.total || 0;

        // 2. Revenue by Client
        const clientRes = await query(`
            SELECT c."ClientName", SUM(d."GiftAmount") as total 
            FROM "Donations" d 
            JOIN "Clients" c ON d."ClientID" = c."ClientID" 
            ${whereClause}
            GROUP BY c."ClientName"
            ORDER BY total DESC
        `, params);

        // 3. Donations by Payment Method
        const methodRes = await query(`
            SELECT d."GiftMethod", COUNT(*) as count, SUM(d."GiftAmount") as total 
            FROM "Donations" d
            ${whereClause}
            GROUP BY d."GiftMethod"
        `, params);

        // 4. Donations by Platform
        const platformRes = await query(`
            SELECT d."GiftPlatform", COUNT(*) as count, SUM(d."GiftAmount") as total 
            FROM "Donations" d
            ${whereClause}
            GROUP BY d."GiftPlatform"
        `, params);

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
