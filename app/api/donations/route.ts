
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const assignedToUserId = searchParams.get('assignedToUserId');
        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        const isFlagged = searchParams.get('isFlagged');
        const clientId = searchParams.get('clientId');

        if (assignedToUserId) {
            whereClause += ` AND "AssignedToUserID" = $${paramIndex++}`;
            params.push(assignedToUserId);
        }

        if (isFlagged === 'true') {
            whereClause += ` AND "IsFlagged" = TRUE`;
        }

        if (clientId) {
            whereClause += ` AND d."ClientID" = $${paramIndex++}`;
            params.push(clientId);
        }

        const sql = `
            SELECT d.*, 
                   c."ClientName", c."ClientCode",
                   b."Date" as "BatchDate"
            FROM "Donations" d
            LEFT JOIN "Clients" c ON d."ClientID" = c."ClientID"
            LEFT JOIN "Batches" b ON d."BatchID" = b."BatchID"
            ${whereClause}
            ORDER BY d."CreatedAt" DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        params.push(limit, offset);

        const res = await query(sql, params);
        return NextResponse.json(res.rows);

    } catch (error) {
        console.error('GET /api/donations error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
