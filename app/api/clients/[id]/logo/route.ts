
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = await query('SELECT "LogoData", "MimeType" FROM "Clients" WHERE "ClientID" = $1', [id]);

        if (result.rows.length === 0 || !result.rows[0].LogoData) {
            return new NextResponse(null, { status: 404 });
        }

        const { LogoData, MimeType } = result.rows[0];

        return new NextResponse(LogoData, {
            headers: {
                'Content-Type': MimeType || 'image/png',
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } catch (error) {
        console.error('GET Logo Error:', error);
        return new NextResponse(null, { status: 500 });
    }
}
