
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, taskId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await params;

    try {
        const body = await req.json();
        const { IsCompleted } = body;

        if (IsCompleted === undefined) return NextResponse.json({ error: 'IsCompleted required' }, { status: 400 });

        const completedAt = IsCompleted ? new Date() : null;

        await query(`
            UPDATE "DonorTasks"
            SET "IsCompleted" = $1, "CompletedAt" = $2
            WHERE "TaskID" = $3
        `, [IsCompleted, completedAt, taskId]);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, taskId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await params;

    try {
        await query('DELETE FROM "DonorTasks" WHERE "TaskID" = $1', [taskId]);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
