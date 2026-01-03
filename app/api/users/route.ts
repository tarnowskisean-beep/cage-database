import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const res = await query('SELECT "UserID", "Username", "Email", "Role", "Initials", "IsActive", "CreatedAt" FROM "Users" ORDER BY "Username" ASC');
        return NextResponse.json(res.rows);
    } catch (error) {
        console.error('GET /api/users error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { username, email, password, role, initials } = body;

        // Validation
        if (!username || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const res = await query(`
            INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials", "IsActive")
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING "UserID", "Username", "Email", "Role", "Initials", "CreatedAt"
        `, [username, email, hashedPassword, role, initials || username.slice(0, 2).toUpperCase()]);

        return NextResponse.json(res.rows[0]);
    } catch (error: any) {
        console.error('POST /api/users error:', error);
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Username or Email already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
