
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);

        // 1. Check if user exists
        const check = await query('SELECT "UserID" FROM "Users" WHERE "Username" = $1', ['agraham']);

        if (check.rows.length === 0) {
            // 2. Insert if missing
            await query(
                `INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
                 VALUES ($1, $2, $3, $4, $5)`,
                ['agraham', 'alyssa@compass.com', passwordHash, 'Admin', 'AG']
            );
            return NextResponse.json({ success: true, message: 'User agraham CREATED with password123' });
        } else {
            // 3. Update if exists
            await query(
                'UPDATE "Users" SET "PasswordHash" = $1 WHERE "Username" = $2',
                [passwordHash, 'agraham']
            );
            return NextResponse.json({ success: true, message: 'User agraham UPDATED with password123' });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
