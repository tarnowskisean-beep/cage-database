import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (clientId) {
      conditions.push(`b."ClientID" = $${paramIndex++}`);
      params.push(clientId);
    }
    if (startDate) {
      conditions.push(`b."Date" >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`b."Date" <= $${paramIndex++}`);
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT 
        b."BatchID", b."BatchCode", b."EntryMode", b."PaymentCategory", b."Status", b."Date", b."CreatedAt",
        c."ClientCode", c."ClientName",
        u."Username" as "CreatedBy"
      FROM "Batches" b
      JOIN "Clients" c ON b."ClientID" = c."ClientID"
      JOIN "Users" u ON b."CreatedBy" = u."UserID"
      ${whereClause}
      ORDER BY b."CreatedAt" DESC
    `, params);

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
        INSERT INTO "Batches" (
            "BatchCode", "ClientID", "EntryMode", "PaymentCategory", "ZerosType", "CreatedBy", "Status", "Date",
            "DefaultGiftMethod", "DefaultGiftPlatform", "DefaultTransactionType", "DefaultGiftYear", "DefaultGiftQuarter",
            "DefaultGiftType"
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'Open', $7, $8, $9, $10, $11, $12, $13)
        RETURNING "BatchID", "BatchCode"
      `, [
      batchCode,
      clientId,
      entryMode,
      paymentCategory,
      zerosType || null,
      userId,
      body.date || new Date().toISOString(),
      body.defaultGiftMethod || 'Check',
      body.defaultGiftPlatform || 'Cage',
      body.defaultTransactionType || 'Donation',
      body.defaultGiftYear || new Date().getFullYear(),
      body.defaultGiftQuarter || 'Q1',
      body.defaultGiftType || 'Individual/Trust/IRA'
    ]);

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('POST /api/batches error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
