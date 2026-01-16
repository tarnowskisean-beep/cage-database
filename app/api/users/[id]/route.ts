import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { email, role, password, is_active, receiveFlaggedAlerts } = body;

        // Build Update Query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let queryIdx = 1;

        if (email) {
            updates.push(`"Email" = $${queryIdx++}`);
            values.push(email);
        }
        if (role) {
            updates.push(`"Role" = $${queryIdx++}`);
            values.push(role);
        }
        if (is_active !== undefined) {
            updates.push(`"IsActive" = $${queryIdx++}`);
            values.push(is_active);
        }
        if (receiveFlaggedAlerts !== undefined) {
            updates.push(`"ReceiveFlaggedAlerts" = $${queryIdx++}`);
            values.push(receiveFlaggedAlerts);
        }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updates.push(`"PasswordHash" = $${queryIdx++}`);
            values.push(hashedPassword);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        const sql = `UPDATE "Users" SET ${updates.join(', ')} WHERE "UserID" = $${queryIdx} RETURNING "UserID", "Username", "Email", "Role", "IsActive"`;

        const res = await query(sql, values);

        if (res.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error('PUT /api/users/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Prevent deleting self
        if ((session.user as any).id === id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // Soft Delete (Set IsActive = false)
        const res = await query('UPDATE "Users" SET "IsActive" = false WHERE "UserID" = $1 RETURNING "UserID"', [id]);

        if (res.rowCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deactivated' });
    } catch (error) {
        console.error('DELETE /api/users/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
