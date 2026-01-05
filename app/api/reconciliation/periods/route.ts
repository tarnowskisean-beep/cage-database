
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

// GET /api/reconciliation/periods?clientId=1
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    try {
        let sql = `
            SELECT 
                p.*,
                c."ClientName"
            FROM "ReconciliationPeriods" p
            JOIN "Clients" c ON p."ClientID" = c."ClientID"
            WHERE 1=1
        `;
        const params: any[] = [];

        if (clientId) {
            params.push(clientId);
            sql += ` AND p."ClientID" = $${params.length}`;
        }
        if (start) {
            params.push(start);
            sql += ` AND p."PeriodStartDate" >= $${params.length}`;
        }
        if (end) {
            params.push(end);
            sql += ` AND p."PeriodEndDate" <= $${params.length}`;
        }

        sql += ` ORDER BY p."PeriodStartDate" DESC`;

        const res = await query(sql, params);
        return NextResponse.json(res.rows);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST /api/reconciliation/periods
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const userId = session.user?.id;

    try {
        const body = await req.json();
        const { clientId, startDate, endDate } = body;

        if (!clientId || !startDate || !endDate) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const end = new Date(endDate);
        const transferDateKey = new Date(end);
        transferDateKey.setDate(end.getDate() + 14);
        const transferDate = transferDateKey.toISOString().split('T')[0];

        const res = await query(`
            INSERT INTO "ReconciliationPeriods" 
            ("ClientID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status", "CreatedBy")
            VALUES ($1, $2, $3, $4, 'Open', $5)
            RETURNING "ReconciliationPeriodID"
        `, [clientId, startDate, endDate, transferDate, userId]);

        const periodId = res.rows[0].ReconciliationPeriodID;

        await query(`
            INSERT INTO "ReconciliationBatchDetails" ("ReconciliationPeriodID")
            VALUES ($1)
        `, [periodId]);

        return NextResponse.json({ success: true, ReconciliationPeriodID: periodId });
    } catch (e: any) {
        if (e.code === '23505') {
            return NextResponse.json({ error: 'Period already exists for these dates.' }, { status: 409 });
        }
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
