
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const res = await query(`
            SELECT ar.*, u."Username" as "AssignedToUsername"
            FROM "AssignmentRules" ar
            JOIN "Users" u ON ar."AssignToUserID" = u."UserID"
            ORDER BY ar."Priority" ASC
        `);

        return NextResponse.json(res.rows);
    } catch (error) {
        console.error('GET /api/settings/assignment-rules error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'Admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, priority, isActive, assignToUserId,
            amountMin, amountMax, state, zipPrefix, campaignId
        } = body;

        if (!name || !assignToUserId) {
            return NextResponse.json({ error: 'Name and AssignToUserID are required' }, { status: 400 });
        }

        const res = await query(
            `INSERT INTO "AssignmentRules" 
            ("Name", "Priority", "IsActive", "AssignToUserID", "AmountMin", "AmountMax", "State", "ZipPrefix", "CampaignID")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                name,
                priority || 0,
                isActive !== false, // default true
                assignToUserId,
                amountMin || null,
                amountMax || null,
                state || null,
                zipPrefix || null,
                campaignId || null
            ]
        );

        return NextResponse.json(res.rows[0]);

    } catch (error: any) {
        console.error('POST /api/settings/assignment-rules error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
