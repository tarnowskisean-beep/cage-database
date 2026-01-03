import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Running migration: Creating UserClients and PasswordResetTokens Tables...');
        await query(`
            CREATE TABLE IF NOT EXISTS "UserClients" (
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ClientID" INT REFERENCES "Clients"("ClientID") ON DELETE CASCADE,
                PRIMARY KEY ("UserID", "ClientID")
            );
            
            CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
                "Token" TEXT PRIMARY KEY,
                "UserID" INT REFERENCES "Users"("UserID") ON DELETE CASCADE,
                "ExpiresAt" TIMESTAMPTZ NOT NULL,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        return NextResponse.json({ success: true, message: 'Migration complete. Tables created.' });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
