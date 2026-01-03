
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        console.log('Running Migrations for Import History...');

        // 1. Add ImportSessionID to Batches
        await query(`
            ALTER TABLE "Batches" 
            ADD COLUMN IF NOT EXISTS "ImportSessionID" INT REFERENCES "import_sessions"("id") ON DELETE SET NULL;
        `);

        // 2. Add ImportSessionID to Donations (useful for direct tracking if batch is mixed, though imports usually isolate batches)
        await query(`
            ALTER TABLE "Donations"
            ADD COLUMN IF NOT EXISTS "ImportSessionID" INT REFERENCES "import_sessions"("id") ON DELETE SET NULL;
        `);

        return NextResponse.json({ success: true, message: 'Schema Updated for Import History' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
