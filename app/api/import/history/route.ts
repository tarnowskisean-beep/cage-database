
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAction } from "@/lib/audit";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const res = await query(`
            SELECT 
                s.*,
                u."Username" as "CreatedByName",
                (SELECT COUNT(*) FROM "Batches" b WHERE b."ImportSessionID" = s."id") as "BatchesCreated",
                (SELECT COUNT(*) FROM "Donations" d WHERE d."ImportSessionID" = s."id") as "DonationsCreated"
            FROM "import_sessions" s
            LEFT JOIN "Users" u ON s."created_by" = u."UserID"
            ORDER BY s."created_at" DESC
            LIMIT 50
        `);
        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
