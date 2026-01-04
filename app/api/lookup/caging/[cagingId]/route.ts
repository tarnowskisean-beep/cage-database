import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ cagingId: string }> }) {
    try {
        const { cagingId } = await params;
        // In real world, we might need ClientID context too to ensure unique lookup if CagingIDs collide across clients.
        // But for now, let's search globally or assume CagingID includes client prefix.

        const res = await query(`
            SELECT * FROM "Prospects" WHERE "CagingID" = $1 LIMIT 1
        `, [cagingId]);

        if (res.rows.length === 0) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        return NextResponse.json({ found: true, record: res.rows[0] });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }
}
