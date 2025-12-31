import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query('SELECT "ClientID", "ClientCode", "ClientName" FROM "Clients" ORDER BY "ClientCode"');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
