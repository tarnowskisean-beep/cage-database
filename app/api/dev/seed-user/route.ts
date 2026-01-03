
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Wipe all users
        await query('DELETE FROM "Users"');

        // 2. Create Admin Sean
        await query(
            `INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
             VALUES ($1, $2, $3, $4, $5)`,
            ['starnowski', 'tarnowski.sean@gmail.com', passwordHash, 'Admin', 'ST']
        );

        return NextResponse.json({ success: true, message: 'Database Wiped. Admin starnowski created with password123' });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
