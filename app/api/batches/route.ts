import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
      SELECT 
        b."BatchID", b."BatchCode", b."EntryMode", b."PaymentCategory", b."Status", b."Date", b."CreatedAt",
        c."ClientCode", c."ClientName",
        u."Username" as "CreatedBy"
      FROM "Batches" b
      JOIN "Clients" c ON b."ClientID" = c."ClientID"
      JOIN "Users" u ON b."CreatedBy" = u."UserID"
      ORDER BY b."CreatedAt" DESC
    `);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/batches error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, entryMode, paymentCategory, zerosType } = body;

        // Hardcoded User for MVP
        const userId = 1;

        // Generate Batch Code: Postgres specific logic
        // We need initials first. Ideally fetch from User table, but hardcoding for speed as per previous step.
        const userInitials = 'AG';

        const countRes = await query(`
        SELECT COUNT(*) as count 
        FROM "Batches" 
        WHERE "CreatedBy" = $1 
        AND "Date"::date = CURRENT_DATE
      `, [userId]);

        const dailyCount = parseInt(countRes.rows[0].count) + 1;
        const batchCode = `${userInitials}.${dailyCount.toString().padStart(2, '0')}`;

        const result = await query(`
        INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "ZerosType", "CreatedBy", "Status", "Date")
        VALUES ($1, $2, $3, $4, $5, $6, 'Open', NOW())
        RETURNING "BatchID", "BatchCode"
      `, [batchCode, clientId, entryMode, paymentCategory, zerosType || null, userId]);

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('POST /api/batches error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
