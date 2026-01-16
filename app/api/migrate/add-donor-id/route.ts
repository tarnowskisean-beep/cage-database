
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await query(`
            ALTER TABLE "Donations" 
            ADD COLUMN IF NOT EXISTS "DonorID" INT REFERENCES "Donors"("DonorID");
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS "idx_donations_donorid" ON "Donations" ("DonorID");
        `);

        return NextResponse.json({ success: true, message: 'Added DonorID to Donations' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
