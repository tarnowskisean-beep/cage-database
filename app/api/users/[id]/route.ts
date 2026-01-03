import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { role } = body;

        if (!role) {
            return NextResponse.json({ error: 'Missing role' }, { status: 400 });
        }

        const result = await query(`
            UPDATE "Users"
            SET "Role" = $1
            WHERE "UserID" = $2
            RETURNING "UserID", "Username", "Role"
        `, [role, id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Prevent deleting the last Admin or self (logic for self-deletion check often simpler on frontend or context)
        // For now, simple Delete.

        await query(`DELETE FROM "Users" WHERE "UserID" = $1`, [id]);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
