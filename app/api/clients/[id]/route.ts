
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = await query('SELECT * FROM "Clients" WHERE "ClientID" = $1', [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('GET Client Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const name = formData.get('name') as string;
            const clientType = formData.get('clientType') as string;
            const status = formData.get('status') as string; // 'Active' or 'Inactive'
            const file = formData.get('logo') as File | null;

            if (!name) {
                return NextResponse.json({ error: 'Client Name is required' }, { status: 400 });
            }

            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const mimeType = file.type;

                // Update with Logo Data
                const result = await query(
                    `UPDATE "Clients" 
                     SET "ClientName" = $1, "LogoData" = $2, "MimeType" = $3, "LogoURL" = $4, "ClientType" = $5, "Status" = $6 
                     WHERE "ClientID" = $7 
                     RETURNING *`,
                    [name, buffer, mimeType, `/api/clients/${id}/logo`, clientType || null, status || 'Active', id]
                );
                return NextResponse.json(result.rows[0]);
            } else {
                // Update Metadata only
                const result = await query(
                    `UPDATE "Clients" 
                     SET "ClientName" = $1, "ClientType" = $2, "Status" = $3 
                     WHERE "ClientID" = $4 
                     RETURNING *`,
                    [name, clientType || null, status || 'Active', id]
                );
                return NextResponse.json(result.rows[0]);
            }
        } else {
            // JSON Fallback
            const body = await request.json();
            const { name, clientType, status } = body;

            const result = await query(
                `UPDATE "Clients" 
                 SET "ClientName" = $1, "ClientType" = $2, "Status" = $3 
                 WHERE "ClientID" = $4 
                 RETURNING *`,
                [name, clientType || null, status || 'Active', id]
            );
            return NextResponse.json(result.rows[0]);
        }
    } catch (error) {
        console.error('PUT Client Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await query('DELETE FROM "Clients" WHERE "ClientID" = $1', [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Client Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
