import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'Admin') {
        return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    try {
        const result = await query(`
            SELECT "UserID", "Username", "Email", "Role", "Initials", "CreatedAt"
            FROM "Users"
            ORDER BY "Username" ASC
        `);
        return NextResponse.json(result.rows);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'Admin') {
        return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username, email, password, role } = body;

        if (!username || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const initials = username.slice(0, 2).toUpperCase();

        const result = await query(`
            INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING "UserID", "Username", "Email", "Role", "Initials"
        `, [username, email, hashedPassword, role, initials]);

        return NextResponse.json(result.rows[0]);

    } catch (e: any) {
        console.error(e);
        if (e.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Username or Email already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
