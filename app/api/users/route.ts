import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendWelcomeEmail } from '@/lib/email';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const res = await query('SELECT "UserID", "Username", "Email", "Role", "Initials", "IsActive", "CreatedAt" FROM "Users" ORDER BY "Username" ASC');

        console.log(`GET /api/users: Request by Admin ${(session.user as any).id} (${(session.user as any).email})`);
        console.log(`GET /api/users: Returning ${res.rows.length} users. User IDs: ${res.rows.map(u => u.UserID).join(', ')}`);

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
        const { username, email, role, password, allowedClientIds, sendInvite } = body;

        // Validation
        if (!username || !email || !role) { // Password not strictly required if invite
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Create User
        // If invite is sent, we might set a random temp password hash or handle it elegantly?
        // Let's set a placeholder hash if undefined
        const hashedPassword = password ? await bcrypt.hash(password, 10) : 'PENDING_SETUP';

        const res = await query(
            `INSERT INTO "Users" ("Username", "Email", "Role", "PasswordHash", "Initials")
             VALUES ($1, $2, $3, $4, $5)
             RETURNING "UserID"`,
            [username, email, role, hashedPassword, username.substring(0, 2).toUpperCase()]
        );
        const newUserId = res.rows[0].UserID;

        // 2. Handle Multi-Client Access
        if (allowedClientIds && Array.isArray(allowedClientIds) && allowedClientIds.length > 0) {
            // Bulk insert
            const values: string[] = [];
            const params: any[] = [];
            let pIdx = 1;

            for (const clientId of allowedClientIds) {
                values.push(`($${pIdx++}, $${pIdx++})`);
                params.push(newUserId, clientId);
            }

            if (values.length > 0) {
                await query(`
                    INSERT INTO "UserClients" ("UserID", "ClientID")
                    VALUES ${values.join(', ')}
                `, params);
            }
        }

        // 3. Handle Email Invite
        if (sendInvite) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await query(
                `INSERT INTO "PasswordResetTokens" ("Token", "UserID", "ExpiresAt") VALUES ($1, $2, $3)`,
                [token, newUserId, expires]
            );

            await sendWelcomeEmail(email, token);
        }

        return NextResponse.json({ success: true, userId: newUserId });
    } catch (error: any) {
        console.error('POST /api/users error:', error);
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Username or Email already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
