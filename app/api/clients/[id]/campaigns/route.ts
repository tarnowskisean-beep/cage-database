import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = await query(`
            SELECT DISTINCT "CampaignID" 
            FROM "Donations" 
            WHERE "ClientID" = $1 AND "CampaignID" IS NOT NULL AND "CampaignID" != ''
            ORDER BY "CampaignID" ASC
        `, [id]);

        return NextResponse.json(result.rows.map(r => r.CampaignID));
    } catch (error) {
        console.error('Fetch campaigns error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
