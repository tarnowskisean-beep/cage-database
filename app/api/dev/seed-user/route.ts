import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function runSeed() {
    console.log('[Seed] Starting...');
    try {
        // 0. Ensure Migrations
        console.log('[Seed] Creating Tables...');
        await query(`
            CREATE TABLE IF NOT EXISTS "UserClients" (
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ClientID" INT REFERENCES "Clients"("ClientID") ON DELETE CASCADE,
                PRIMARY KEY ("UserID", "ClientID")
            );
        `);
        console.log('[Seed] UserClients Created.');

        await query(`
            CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
                "Token" TEXT PRIMARY KEY,
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ExpiresAt" TIMESTAMPTZ NOT NULL,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('[Seed] PasswordResetTokens Created.');

        console.log('[Seed] Hashing password...');
        const passwordHash = await bcrypt.hash('password123', 10);
        console.log('[Seed] Password hashed.');

        console.log('[Seed] Upserting User...');
        const userCheck = await query('SELECT "UserID" FROM "Users" WHERE "Username" = $1', ['starnowski']);

        if (userCheck.rows.length === 0) {
            await query(
                `INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
                 VALUES ($1, $2, $3, $4, $5)`,
                ['starnowski', 'tarnowski.sean@gmail.com', passwordHash, 'Admin', 'ST']
            );
            console.log('[Seed] User Created.');
            return NextResponse.json({
                success: true,
                message: `[V6 Success] Tables Verified. User starnowski CREATED.`
            });
        } else {
            await query(
                'UPDATE "Users" SET "PasswordHash" = $1, "Role" = $2 WHERE "Username" = $3',
                [passwordHash, 'Admin', 'starnowski']
            );
            console.log('[Seed] User Updated.');
            return NextResponse.json({
                success: true,
                message: `[V6 Success] Tables Verified. User starnowski UPDATED.`
            });
        }
    } catch (e: any) {
        console.error('[Seed Error]', e);
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}

export async function GET() {
    return runSeed();
}

export async function POST() {
    return runSeed();
}
