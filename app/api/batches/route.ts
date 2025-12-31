import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET() {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT 
        b.BatchID, b.BatchCode, b.EntryMode, b.PaymentCategory, b.Status, b.Date, b.CreatedAt,
        c.ClientCode, c.ClientName,
        u.Username as CreatedBy
      FROM Batches b
      JOIN Clients c ON b.ClientID = c.ClientID
      JOIN Users u ON b.CreatedBy = u.UserID
      ORDER BY b.CreatedAt DESC
    `);

        return NextResponse.json(result.recordset);
    } catch (error) {
        console.error('GET /api/batches error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, entryMode, paymentCategory, zerosType } = body;

        // Hardcoded User for MVP (User ID 1 = Admin/Alyssa)
        const userId = 1;
        const userInitials = 'AG';

        const pool = await getPool();

        // Generate Batch Code logic: Count batches for this user today
        const countResult = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
        SELECT COUNT(*) as count 
        FROM Batches 
        WHERE CreatedBy = @UserID 
        AND CAST(Date AS DATE) = CAST(GETDATE() AS DATE)
      `);

        const dailyCount = countResult.recordset[0].count + 1;
        const batchCode = `${userInitials}.${dailyCount.toString().padStart(2, '0')}`;

        // Insert
        const result = await pool.request()
            .input('BatchCode', sql.NVarChar, batchCode)
            .input('ClientID', sql.Int, clientId)
            .input('EntryMode', sql.NVarChar, entryMode)
            .input('PaymentCategory', sql.NVarChar, paymentCategory)
            .input('ZerosType', sql.NVarChar, zerosType || null) // Optional
            .input('CreatedBy', sql.Int, userId)
            .query(`
        INSERT INTO Batches (BatchCode, ClientID, EntryMode, PaymentCategory, ZerosType, CreatedBy, Status, Date)
        OUTPUT INSERTED.BatchID, INSERTED.BatchCode
        VALUES (@BatchCode, @ClientID, @EntryMode, @PaymentCategory, @ZerosType, @CreatedBy, 'Open', GETDATE())
      `);

        return NextResponse.json(result.recordset[0]);
    } catch (error) {
        console.error('POST /api/batches error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
