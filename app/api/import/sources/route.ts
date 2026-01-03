import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Get distinct source systems from rules, plus ensure defaults exists
        // We use a UNION to ensure our defaults always appear even if no rules exist yet
        const res = await query(`
            SELECT DISTINCT "source_system" 
            FROM "mapping_rules" 
            WHERE "source_system" != '*' 
            ORDER BY "source_system" ASC
        `);

        const sources = res.rows.map(r => r.source_system);

        // Ensure defaults are present if not in DB
        const defaults = ['Winred', 'Stripe', 'Anedot', 'Cage'];
        const uniqueSources = Array.from(new Set([...defaults, ...sources])).sort();

        return NextResponse.json(uniqueSources);
    } catch (error) {
        console.error('GET /api/import/sources error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
