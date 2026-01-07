import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Defaults for Chart Series
        const defaultStart = new Date();
        defaultStart.setMonth(defaultStart.getMonth() - 6);
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : new Date();

        // Build dynamic WHERE clause for Donations
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
            params.push(`${endDate} 23:59:59`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Build Audit Log Filter
        const auditConditions: string[] = [];
        const auditParams: unknown[] = [];
        let auditParamIndex = 1;

        if (startDate) {
            auditConditions.push(`"CreatedAt" >= $${auditParamIndex++}`);
            auditParams.push(startDate);
        }
        if (endDate) {
            auditConditions.push(`"CreatedAt" <= $${auditParamIndex++}`);
            auditParams.push(`${endDate} 23:59:59`);
        }
        // Client filtering for Audit Logs (Best Effort Text Match on JSON String)
        if (clientId) {
            auditConditions.push(`"Details" ILIKE $${auditParamIndex++}`);
            auditParams.push(`%${clientId}%`);
        }

        const auditWhere = auditConditions.length > 0 ? `WHERE ${auditConditions.join(' AND ')}` : '';

        // Execute all aggregations
        const [
            revenueRes,
            clientRes,
            methodRes,
            platformRes,
            openBatchesRes,
            closedBatchesRes,
            uniqueDonorsRes,
            chartRes,
            logsRes,
            pendingResolutionRes,
            flaggedRes
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

            // 5. Open Batches Count (Respects Client Filter)
            query(
                `SELECT COUNT(*) as count FROM "Batches" WHERE "Status" = 'Open' ${clientId ? 'AND "ClientID" = $1' : ''}`,
                clientId ? [clientId] : []
            ),

            // 6. Closed Batches Count (Respects Client Filter)
            query(
                `SELECT COUNT(*) as count FROM "Batches" WHERE "Status" = 'Closed' ${clientId ? 'AND "ClientID" = $1' : ''}`,
                clientId ? [clientId] : []
            ),

            // 7. Unique Donors
            query(`SELECT COUNT(DISTINCT d."DonorID") as count FROM "Donations" d ${whereClause}`, params),

            // 8. Chart Data (Clean Params Logic)
            (() => {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const interval = diffDays > 60 ? '1 month' : '1 day';
                const dateFormat = diffDays > 60 ? 'Mon YY' : 'MM/DD';

                // Construct specific params for this complex query to avoid index confusion
                const chartParams: any[] = [start.toISOString(), end.toISOString()];
                let clientClause = '';

                if (clientId) {
                    chartParams.push(clientId);
                    clientClause = 'AND d."ClientID" = $3';
                }

                // $1 = Start, $2 = End, $3 = ClientID (optional)
                const truncUnit = diffDays > 60 ? 'month' : 'day';
                return query(`
                    WITH date_series AS (
                        SELECT generate_series(
                            DATE_TRUNC('${truncUnit}', $1::timestamp), 
                            DATE_TRUNC('${truncUnit}', $2::timestamp), 
                            '${interval}'::interval
                        ) as day
                    )
                    SELECT 
                        TO_CHAR(ds.day, '${dateFormat}') as name,
                        COALESCE(SUM(d."GiftAmount"), 0) as amount,
                        COUNT(d."DonationID") as count
                    FROM date_series ds
                    LEFT JOIN "Donations" d ON DATE_TRUNC('${truncUnit}', d."GiftDate") = ds.day
                    ${clientClause}
                    GROUP BY ds.day
                    ORDER BY ds.day
                `, chartParams);
            })(),

            // 9. Recent Logs (Filtered)
            query(`SELECT * FROM "AuditLogs" ${auditWhere} ORDER BY "CreatedAt" DESC LIMIT 5`, auditParams),

            // 10. Pending Resolutions (Dedup)
            query(`SELECT COUNT(*) as count FROM "Donations" WHERE "ResolutionStatus" = 'Pending'`),

            // 11. Flagged Items (My Alerts)
            query(`SELECT COUNT(*) as count FROM "Donations" WHERE "IsFlagged" = TRUE`)
        ]);

        const totalRevenue = revenueRes.rows[0]?.total || 0;

        return NextResponse.json({
            // KPI Cards
            totalValidAmount: parseFloat(totalRevenue.toString()),
            openBatches: parseInt(openBatchesRes.rows[0]?.count || '0'),
            closedBatches: parseInt(closedBatchesRes.rows[0]?.count || '0'),
            uniqueDonors: parseInt(uniqueDonorsRes.rows[0]?.count || '0'),
            pendingResolutions: parseInt(pendingResolutionRes.rows[0]?.count || '0'), // Dedup
            flaggedItems: parseInt(flaggedRes.rows[0]?.count || '0'), // New Flags

            // Charts & Tables
            chartData: chartRes.rows.map(row => ({
                name: row.name,
                amount: parseFloat(row.amount),
                count: parseInt(row.count)
            })),
            recentLogs: logsRes.rows,

            // Legacy / Extra Data
            totalRevenue: parseFloat(totalRevenue.toString()),
            byClient: clientRes.rows.map(row => ({ ...row, total: parseFloat(row.total) })),
            byMethod: methodRes.rows.map(row => ({ name: row.GiftMethod || 'Unknown', count: parseInt(row.count), total: parseFloat(row.total) })),
            byPlatform: platformRes.rows.map(row => ({ name: row.GiftPlatform || 'Unknown', count: parseInt(row.count), total: parseFloat(row.total) }))
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats', details: error.message }, { status: 500 });
    }
}
