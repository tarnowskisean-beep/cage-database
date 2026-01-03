
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
        }

        // 1. Verify Token
        const tokenRes = await query('SELECT * FROM "PasswordResetTokens" WHERE "Token" = $1', [token]);
        if (tokenRes.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        const resetRecord = tokenRes.rows[0];
        const now = new Date();
        const expiresAt = new Date(resetRecord.ExpiresAt);

        if (now > expiresAt) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        // 2. Update User Password
        const hashedPassword = await bcrypt.hash(password, 10);
        await query('UPDATE "Users" SET "PasswordHash" = $1, "IsActive" = true WHERE "UserID" = $2', [hashedPassword, resetRecord.UserID]);

        // 3. Delete Token (One-time use)
        await query('DELETE FROM "PasswordResetTokens" WHERE "Token" = $1', [token]);

        return NextResponse.json({ success: true, message: 'Password set successfully' });

    } catch (error: any) {
        console.error('Password setup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
