
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await query('DELETE FROM "AssignmentRules" WHERE "RuleID" = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/settings/assignment-rules/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Simple update for IsActive toggle or full edit (not implemented full edit UI yet, but API should support it)
        const { isActive } = body;

        if (isActive !== undefined) {
            await query('UPDATE "AssignmentRules" SET "IsActive" = $1 WHERE "RuleID" = $2', [isActive, id]);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('PUT /api/settings/assignment-rules/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
