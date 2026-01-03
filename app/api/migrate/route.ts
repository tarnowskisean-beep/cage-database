import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Running migration: Adding ClientID to Users...');
        await query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ClientID" INT REFERENCES "Clients"("ClientID");`);
        return NextResponse.json({ success: true, message: 'Migration complete. ClientID column added to Users.' });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
