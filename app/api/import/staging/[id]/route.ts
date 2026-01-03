import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionId = params.id;

        const result = await query(`
            SELECT "id", "normalized_data", "validation_status", "defaults_applied"
            FROM "staging_revenue" 
            WHERE "session_id" = $1
            ORDER BY "id" ASC
            LIMIT 1000
        `, [sessionId]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/import/staging error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
