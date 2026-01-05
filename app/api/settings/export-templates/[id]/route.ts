import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const res = await query(`SELECT * FROM "export_templates" WHERE "id" = $1`, [id]);
        if (res.rows.length === 0) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const body = await req.json();
        const { name, mappings } = body;

        const res = await query(
            `UPDATE "export_templates" SET "name" = $1, "mappings" = $2, "updated_at" = NOW() WHERE "id" = $3 RETURNING *`,
            [name, JSON.stringify(mappings), id]
        );

        if (res.rows.length === 0) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        return NextResponse.json(res.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        await query(`DELETE FROM "export_templates" WHERE "id" = $1`, [id]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
