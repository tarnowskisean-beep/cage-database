
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 });

    try {
        const res = await query(`
            SELECT * FROM "ClientBankAccounts" 
            WHERE "ClientID" = $1 AND "IsActive" = TRUE
            ORDER BY "AccountName" ASC
        `, [clientId]);

        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
