import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const res = await query(`SELECT * FROM "export_templates" ORDER BY "created_at" DESC`);
        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { name, mappings } = body;

        if (!name || !mappings) {
            return NextResponse.json({ error: 'Name and Mappings are required' }, { status: 400 });
        }

        const res = await query(
            `INSERT INTO "export_templates" ("name", "mappings") VALUES ($1, $2) RETURNING *`,
            [name, JSON.stringify(mappings)]
        );

        return NextResponse.json(res.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
