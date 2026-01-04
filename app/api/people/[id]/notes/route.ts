
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        const notes = await query(`
            SELECT * FROM "DonorNotes"
            WHERE "DonorID" = $1
            ORDER BY "CreatedAt" DESC
        `, [id]);
        return NextResponse.json(notes.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { content } = await req.json();

    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    try {
        const res = await query(`
            INSERT INTO "DonorNotes" ("DonorID", "AuthorName", "Content")
            VALUES ($1, $2, $3)
            RETURNING *
        `, [id, session.user?.name || 'Unknown', content]);

        return NextResponse.json(res.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
