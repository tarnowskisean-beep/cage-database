import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query('SELECT "ClientID", "ClientCode", "ClientName", "LogoURL" FROM "Clients" ORDER BY "ClientCode"');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, name, logoUrl } = body;

        if (!code || !name) {
            return NextResponse.json({ error: 'Client Code and Name are required' }, { status: 400 });
        }

        // Check if code exists
        const existing = await query('SELECT "ClientID" FROM "Clients" WHERE "ClientCode" = $1', [code]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Client Code already exists' }, { status: 409 });
        }

        const result = await query(
            'INSERT INTO "Clients" ("ClientCode", "ClientName", "LogoURL") VALUES ($1, $2, $3) RETURNING *',
            [code, name, logoUrl || null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const id = formData.get('id') as string;
            const name = formData.get('name') as string;
            const file = formData.get('logo') as File | null;

            if (!id || !name) {
                return NextResponse.json({ error: 'Client ID and Name are required' }, { status: 400 });
            }

            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const mimeType = file.type;

                // Update with Logo Data
                const result = await query(
                    'UPDATE "Clients" SET "ClientName" = $1, "LogoData" = $2, "MimeType" = $3, "LogoURL" = $4 WHERE "ClientID" = $5 RETURNING *',
                    [name, buffer, mimeType, `/api/clients/${id}/logo`, id]
                );
                return NextResponse.json(result.rows[0]);
            } else {
                // Update Name only (preserve existing logo if no file sent)
                const result = await query(
                    'UPDATE "Clients" SET "ClientName" = $1 WHERE "ClientID" = $2 RETURNING *',
                    [name, id]
                );
                return NextResponse.json(result.rows[0]);
            }
        } else {
            // JSON fallback (legacy or name-only update via JSON)
            const body = await request.json();
            const { id, name, logoUrl } = body; // accept logoUrl if manually passed, but prefer file

            if (!id || !name) {
                return NextResponse.json({ error: 'Client ID and Name are required' }, { status: 400 });
            }

            const result = await query(
                'UPDATE "Clients" SET "ClientName" = $1, "LogoURL" = $2 WHERE "ClientID" = $3 RETURNING *',
                [name, logoUrl || null, id]
            );

            if (result.rowCount === 0) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }

            return NextResponse.json(result.rows[0]);
        }
    } catch (error) {
        console.error('PUT /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
