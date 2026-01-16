
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const body = await req.json();
        const { CampaignID, Amount } = body;

        const result = await query(`
            INSERT INTO "Pledges" ("DonorID", "CampaignID", "Amount", "CreatedAt", "UpdatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *
        `, [id, CampaignID, Amount]);

        return NextResponse.json({ success: true, pledge: result.rows[0] });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
