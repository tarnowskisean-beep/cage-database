import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const user = session.user as any;
        const isAdmin = user.role === 'Admin';
        const allowedClientIds = user.allowedClientIds || [];

        let logsQuery = '';
        let countQuery = '';
        let params: any[] = [];

        if (isAdmin) {
            // Admin sees all
            logsQuery = `
                SELECT A.*, U."Username" as "ActorName" 
                FROM "AuditLogs" A
                LEFT JOIN "Users" U ON A."UserID" = U."UserID"
                ORDER BY A."CreatedAt" DESC 
                LIMIT $1 OFFSET $2
            `;
            countQuery = `SELECT COUNT(*) as total FROM "AuditLogs"`;
            params = [limit, offset];
        } else {
            // Client User sees logs from users in their allowed clients
            if (allowedClientIds.length === 0) {
                return NextResponse.json({ logs: [], total: 0, page: 1, totalPages: 0 });
            }

            logsQuery = `
                SELECT DISTINCT A.*, U."Username" as "ActorName"
                FROM "AuditLogs" A
                JOIN "UserClients" UC ON A."UserID" = UC."UserID"
                LEFT JOIN "Users" U ON A."UserID" = U."UserID"
                WHERE UC."ClientID" = ANY($3::int[])
                ORDER BY A."CreatedAt" DESC 
                LIMIT $1 OFFSET $2
            `;
            countQuery = `
                SELECT COUNT(DISTINCT A."LogID") as total 
                FROM "AuditLogs" A
                JOIN "UserClients" UC ON A."UserID" = UC."UserID"
                WHERE UC."ClientID" = ANY($1::int[])
            `;
            params = [limit, offset, allowedClientIds];
        }

        // Exec Query
        // Note: For client query, params mapped differently for logs vs count.
        // Let's execute separately cleanly.

        let logs;
        let total = 0;

        if (isAdmin) {
            logs = await query(logsQuery, [limit, offset]);
            const countRes = await query(countQuery);
            total = parseInt(countRes.rows[0].total);
        } else {
            logs = await query(logsQuery, [limit, offset, allowedClientIds]);
            const countRes = await query(countQuery, [allowedClientIds]);
            total = parseInt(countRes.rows[0].total);
        }

        return NextResponse.json({
            logs: logs.rows,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Audit API Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
