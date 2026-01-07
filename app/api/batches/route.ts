import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CreateBatchSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIdParam = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Enforce Client Access Control
    if (session.user.role === 'ClientUser') {
      if (!session.user.allowedClientIds || session.user.allowedClientIds.length === 0) {
        return NextResponse.json({ error: 'Client User has no assigned Clients' }, { status: 403 });
      }
      conditions.push(`b."ClientID" = ANY($${paramIndex++})`);
      params.push(session.user.allowedClientIds);
    } else if (clientIdParam) {
      // Only allow filtering by param if NOT restricted
      conditions.push(`b."ClientID" = $${paramIndex++}`);
      params.push(clientIdParam);
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

    // New: Filter by Platform (DefaultGiftPlatform)
    const platform = searchParams.get('platform');
    if (platform) {
      conditions.push(`b."DefaultGiftPlatform" = $${paramIndex++}`);
      params.push(platform);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT
        b."BatchID", b."BatchCode", b."EntryMode", b."PaymentCategory", b."Status", b."Date", b."CreatedAt",
        b."ImportSessionID", b."Description", b."AccountID",
        c."ClientCode", c."ClientName",
        a."AccountName",
        u."Username" as "CreatedBy",
        COUNT(d."DonationID")::int as "ItemCount",
        COALESCE(SUM(d."GiftAmount"), 0) as "TotalAmount"
      FROM "Batches" b
      JOIN "Clients" c ON b."ClientID" = c."ClientID"
      LEFT JOIN "ClientBankAccounts" a ON b."AccountID" = a."AccountID"
      JOIN "Users" u ON b."CreatedBy" = u."UserID"
      LEFT JOIN "Donations" d ON b."BatchID" = d."BatchID"
      ${whereClause}
      GROUP BY b."BatchID", c."ClientCode", c."ClientName", a."AccountName", u."Username"
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

    // 1. Validation (Zod)
    const validation = CreateBatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation Failed', details: validation.error.format() }, { status: 400 });
    }
    const data = validation.data;

    // 2. Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enforce Client Permission for Creation
    if ((session.user as any).role === 'ClientUser') {
      const allowedIds: number[] = (session.user as any).allowedClientIds || [];
      if (!allowedIds.includes(Number(data.clientId))) {
        return NextResponse.json({ error: 'You are not authorized to create batches for this client.' }, { status: 403 });
      }
    }

    // 3. User Resolution
    let userId = parseInt(session.user.id);
    let userInitials = (session.user.name || 'Unknown').substring(0, 2).toUpperCase();

    // Handle edge case where session ID is missing
    if (isNaN(userId)) {
      // This lookup is safe to do outside transaction as user ID/username rarely changes rapidly
      const userRes = await query('SELECT "UserID", "Username" FROM "Users" WHERE "Email" = $1', [session.user.email]);
      if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 401 });
      userId = userRes.rows[0].UserID;
      userInitials = userRes.rows[0].Username.substring(0, 2).toUpperCase();
    }

    // 4. Transactional Batch Creation
    const result = await transaction(async (client) => {
      // A. Verify Client exists
      const clientRes = await client.query('SELECT "ClientCode" FROM "Clients" WHERE "ClientID" = $1', [data.clientId]);
      if (clientRes.rows.length === 0) throw new Error('Client not found');
      const clientCode = clientRes.rows[0].ClientCode;

      // B. Platform Short Code
      const abbreviations: Record<string, string> = {
        'Chainbridge': 'CB', 'Stripe': 'ST', 'National Capital': 'NC', 'City National': 'CN',
        'Propay': 'PP', 'Anedot': 'AN', 'Winred': 'WR', 'Cage': 'CG', 'Import': 'IM'
      };
      const platCode = abbreviations[data.defaultGiftPlatform] || data.defaultGiftPlatform.substring(0, 2).toUpperCase();

      // C. Calculate Date Strings
      const dateObj = new Date(data.date || new Date().toISOString());
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}.${mm}.${dd}`;

      // D. CRITICAL: Row Locking for Sequence Generation
      // Lock the user row to serialize batch creation for this specific user
      await client.query('SELECT 1 FROM "Users" WHERE "UserID" = $1 FOR UPDATE', [userId]);

      // E. Count Batches for today for this User
      const countRes = await client.query(`
            SELECT COUNT(*) as count 
            FROM "Batches" 
            WHERE "CreatedBy" = $1 
            AND "Date"::date = $2::date
        `, [userId, data.date || new Date().toISOString()]);

      const dailyCount = parseInt(countRes.rows[0].count) + 1;
      const suffix = `${userInitials}.${dailyCount.toString().padStart(2, '0')}`;
      const batchCode = `${clientCode}.${platCode}.${dateStr}.${suffix}`;

      // F. Insert
      const insertRes = await client.query(`
            INSERT INTO "Batches"(
                "BatchCode", "ClientID", "EntryMode", "PaymentCategory", "ZerosType", "CreatedBy", "Status", "Date",
                "DefaultGiftMethod", "DefaultGiftPlatform", "DefaultTransactionType", "DefaultGiftYear", "DefaultGiftQuarter",
                "DefaultGiftType", "Description", "AccountID"
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Open', $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING "BatchID", "BatchCode"
        `, [
        batchCode,
        data.clientId,
        data.entryMode,
        data.paymentCategory,
        data.zerosType || null,
        userId,
        data.date || new Date().toISOString(),
        data.defaultGiftMethod,
        data.defaultGiftPlatform,
        data.defaultTransactionType,
        data.defaultGiftYear || new Date().getFullYear(),
        data.defaultGiftQuarter || 'Q1',
        data.defaultGiftType || 'Individual/Trust/IRA',
        data.description || null,
        data.accountId ? parseInt(data.accountId) : null
      ]);

      return insertRes.rows[0];
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/batches error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
