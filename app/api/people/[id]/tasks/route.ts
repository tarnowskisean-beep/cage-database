
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const result = await query(`
            SELECT 
                t.*,
                u."Username" as "AssignedToName",
                c."Username" as "CreatedByName"
            FROM "DonorTasks" t
            LEFT JOIN "Users" u ON t."AssignedTo" = u."UserID"
            LEFT JOIN "Users" c ON t."CreatedBy" = c."UserID"
            WHERE t."DonorID" = $1
            ORDER BY t."IsCompleted" ASC, t."DueDate" ASC, t."CreatedAt" DESC
        `, [id]);

        return NextResponse.json(result.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Get current user ID roughly
    // @ts-ignore
    const createdBy = session.user.id || (session.user as any).UserID;

    try {
        const body = await req.json();
        const { Description, AssignedTo, DueDate } = body;

        if (!Description) return NextResponse.json({ error: 'Description required' }, { status: 400 });

        await query(`
            INSERT INTO "DonorTasks" ("DonorID", "Description", "AssignedTo", "DueDate", "CreatedBy")
            VALUES ($1, $2, $3, $4, $5)
        `, [id, Description, AssignedTo || null, DueDate || null, createdBy]);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
