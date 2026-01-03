
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    console.log('SEED ROUTE V3 - UPSERT ONLY (NO DELETE)');
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

        // 1. Check if 'starnowski' exists
        const userCheck = await query('SELECT "UserID" FROM "Users" WHERE "Username" = $1', ['starnowski']);

        if (userCheck.rows.length === 0) {
            // 2. Create if missing
            await query(
                `INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
                 VALUES ($1, $2, $3, $4, $5)`,
                ['starnowski', 'tarnowski.sean@gmail.com', passwordHash, 'Admin', 'ST']
            );
            return NextResponse.json({ success: true, message: 'Tables Created. User starnowski CREATED with password123' });
        } else {
            // 3. Update if exists
            await query(
                'UPDATE "Users" SET "PasswordHash" = $1, "Role" = $2 WHERE "Username" = $3',
                [passwordHash, 'Admin', 'starnowski']
            );
            return NextResponse.json({ success: true, message: 'Tables Created. User starnowski UPDATED with password123' });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
