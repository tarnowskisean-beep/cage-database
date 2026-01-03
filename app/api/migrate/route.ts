import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Running migration: Adding LogoURL...');
        await query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "LogoURL" TEXT;`);
        return NextResponse.json({ success: true, message: 'Migration complete. LogoURL column added.' });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
