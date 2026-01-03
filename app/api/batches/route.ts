import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

    const status = searchParams.get('status');
    if (status) {
      conditions.push(`b."Status" = $${paramIndex++}`);
      params.push(status);
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

    // Get Logged-in User
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let userId = parseInt(session.user.id);
    let userInitials = (session.user.name || 'Unknown').substring(0, 2).toUpperCase();

    // Fallback: If session ID is missing or NaN, lookup by Email
    if (isNaN(userId)) {
      console.warn('Session User ID is NaN, attempting DB lookup for:', session.user.email);
      if (session.user.email) {
        const userRes = await query('SELECT "UserID", "Username" FROM "Users" WHERE "Email" = $1', [session.user.email]);
        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].UserID;
          userInitials = userRes.rows[0].Username.substring(0, 2).toUpperCase();
        } else {
          console.error('User not found by email:', session.user.email);
          return NextResponse.json({ error: 'User lookup failed: ' + session.user.email }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Invalid Session: No ID or Email' }, { status: 401 });
      }
    }
    // Initials from session if available, else derive from name, else fallback
    const userInitials = (session.user.name || 'Unknown').slice(0, 2).toUpperCase();

    // 1. Get Client Code
    const clientRes = await query('SELECT "ClientCode" FROM "Clients" WHERE "ClientID" = $1', [clientId]);
    if (clientRes.rows.length === 0) throw new Error('Client not found');
    const clientCode = clientRes.rows[0].ClientCode;

    // 2. Platform Abbreviation
    const platform = body.defaultGiftPlatform || 'Cage';
    const abbreviations: Record<string, string> = {
      'Chainbridge': 'CB',
      'Stripe': 'ST',
      'National Capital': 'NC',
      'City National': 'CN',
      'Propay': 'PP',
      'Anedot': 'AN',
      'Winred': 'WR',
      'Cage': 'CG',
      'Import': 'IM'
    };
    const platCode = abbreviations[platform] || platform.substring(0, 2).toUpperCase();

    // 3. Date Format (YYYY.MM.DD)
    const dateObj = new Date(body.date || new Date().toISOString());
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}.${mm}.${dd}`;

    // 4. Daily Sequence
    const countRes = await query(`
        SELECT COUNT(*) as count 
        FROM "Batches" 
        WHERE "CreatedBy" = $1 
        AND "Date"::date = $2::date
      `, [userId, body.date || new Date().toISOString()]);

    const dailyCount = parseInt(countRes.rows[0].count) + 1;
    const suffix = `${userInitials}.${dailyCount.toString().padStart(2, '0')}`;

    // 5. Final Batch Code
    const batchCode = `${clientCode}.${platCode}.${dateStr}.${suffix}`;

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
