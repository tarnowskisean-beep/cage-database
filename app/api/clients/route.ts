import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT ClientID, ClientCode, ClientName FROM Clients ORDER BY ClientCode');
        return NextResponse.json(result.recordset);
    } catch (error) {
        console.error('GET /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
