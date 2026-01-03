
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        // 0. Ensure Migrations (Create Tables if missing)
        await query(`
            CREATE TABLE IF NOT EXISTS "UserClients" (
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ClientID" INT REFERENCES "Clients"("ClientID") ON DELETE CASCADE,
                PRIMARY KEY ("UserID", "ClientID")
            );
        `);
        await query(`
            CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
                "Token" TEXT PRIMARY KEY,
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ExpiresAt" TIMESTAMPTZ NOT NULL,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

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
