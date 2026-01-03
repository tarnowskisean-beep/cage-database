
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Fetch distinct platforms from Batches (DefaultGiftPlatform) AND Donations (GiftPlatform) to be thorough?
        // Usually filtering Batches suggests filtering by the Batch's default platform.
        // Let's stick to Batches for now, or union both.

        // Actually, for the filter dropdown, we want to see platforms that actually exist in the DB.
        const res = await query(`
            SELECT DISTINCT "DefaultGiftPlatform" as "Platform" 
            FROM "Batches" 
            WHERE "DefaultGiftPlatform" IS NOT NULL AND "DefaultGiftPlatform" != ''
            ORDER BY "Platform" ASC
        `);

        const platforms = res.rows.map(r => r.Platform);
        return NextResponse.json(platforms);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
