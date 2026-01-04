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

        // Execute all aggregations in parallel to reduce wait time
        const [
            revenueRes,
            clientRes,
            methodRes,
            platformRes,
            openBatchesRes,
            activeClientsRes,
            uniqueDonorsRes,
            chartRes,
            logsRes
        ] = await Promise.all([
            // 1. Total Revenue
            query(`SELECT SUM(d."GiftAmount") as total FROM "Donations" d ${whereClause}`, params),

            // 2. Revenue by Client
            query(`
                SELECT c."ClientName", SUM(d."GiftAmount") as total 
                FROM "Donations" d 
                JOIN "Clients" c ON d."ClientID" = c."ClientID" 
                ${whereClause}
                GROUP BY c."ClientName"
                ORDER BY total DESC
            `, params),

            // 3. Donations by Payment Method
            query(`
                SELECT d."GiftMethod", COUNT(*) as count, SUM(d."GiftAmount") as total 
                FROM "Donations" d
                ${whereClause}
                GROUP BY d."GiftMethod"
            `, params),

            // 4. Donations by Platform
            query(`
                SELECT d."GiftPlatform", COUNT(*) as count, SUM(d."GiftAmount") as total 
                FROM "Donations" d
                ${whereClause}
                GROUP BY d."GiftPlatform"
            `, params),

            // 5. Open Batches Count
            query(`SELECT COUNT(*) as count FROM "Batches" WHERE "Status" = 'Open'`),

            // 6. Active Clients Count
            query(`SELECT COUNT(*) as count FROM "Clients"`),

            // 7. Unique Donors
            query(`SELECT COUNT(DISTINCT d."DonorID") as count FROM "Donations" d ${whereClause}`, params),

            // 8. Chart Data (Revenue by Month)
            query(`
                SELECT TO_CHAR(d."GiftDate", 'Mon') as name, SUM(d."GiftAmount") as amount 
                FROM "Donations" d 
                ${whereClause} 
                GROUP BY TO_CHAR(d."GiftDate", 'Mon'), DATE_TRUNC('month', d."GiftDate") 
                ORDER BY DATE_TRUNC('month', d."GiftDate")
            `, params),

            // 9. Recent Logs
            query(`SELECT * FROM "AuditLog" ORDER BY "CreatedAt" DESC LIMIT 5`)
        ]);

        const totalRevenue = revenueRes.rows[0]?.total || 0;

        return NextResponse.json({
            // KPI Cards
            totalValidAmount: parseFloat(totalRevenue.toString()),
            openBatches: parseInt(openBatchesRes.rows[0]?.count || '0'),
            activeClients: parseInt(activeClientsRes.rows[0]?.count || '0'),
            uniqueDonors: parseInt(uniqueDonorsRes.rows[0]?.count || '0'),

            // Charts & Tables
            chartData: chartRes.rows.map(row => ({ name: row.name, amount: parseFloat(row.amount) })),
            recentLogs: logsRes.rows,

            // Legacy / Extra Data
            totalRevenue: parseFloat(totalRevenue.toString()),
            byClient: clientRes.rows.map(row => ({ ...row, total: parseFloat(row.total) })),
            byMethod: methodRes.rows.map(row => ({ ...row, count: parseInt(row.count), total: parseFloat(row.total) })),
            byPlatform: platformRes.rows.map(row => ({ ...row, count: parseInt(row.count), total: parseFloat(row.total) }))
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
