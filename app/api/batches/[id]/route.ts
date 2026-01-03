import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = await query(`
            SELECT b.*, c."ClientCode" 
            FROM "Batches" b
            LEFT JOIN "Clients" c ON b."ClientID" = c."ClientID"
            WHERE b."BatchID" = $1
        `, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        // Construct update query dynamically (simplistic for now)
        if (status) {
            const result = await query(`
                UPDATE "Batches" 
                SET "Status" = $1 
                WHERE "BatchID" = $2
                RETURNING *
            `, [status, id]);
            return NextResponse.json(result.rows[0]);
        }

        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
