
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const logs = await query(`
            SELECT * FROM "AuditLogs" 
            ORDER BY "CreatedAt" DESC 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await query(`SELECT COUNT(*) as total FROM "AuditLogs"`);
        const total = parseInt(countRes.rows[0].total);

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
