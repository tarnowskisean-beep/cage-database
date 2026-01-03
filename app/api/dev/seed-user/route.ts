
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);
        await query(
            'UPDATE "Users" SET "PasswordHash" = $1 WHERE "Username" = $2',
            [passwordHash, 'agraham']
        );
        return NextResponse.json({ success: true, message: 'User agraham password set to password123' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
