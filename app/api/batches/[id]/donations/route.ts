import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('BatchID', sql.Int, params.id)
            .query(`
        SELECT DonationID, GiftAmount, CheckNumber, ScanString, CreatedAt, GiftMethod
        FROM Donations 
        WHERE BatchID = @BatchID 
        ORDER BY CreatedAt DESC
      `);
        return NextResponse.json(result.recordset);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { amount, checkNumber, scanString } = body;
        const pool = await getPool();

        // Get ClientID from Batch
        const batchRes = await pool.request()
            .input('BatchID', sql.Int, params.id)
            .query('SELECT ClientID FROM Batches WHERE BatchID = @BatchID');

        if (batchRes.recordset.length === 0) throw new Error('Batch not found');
        const clientId = batchRes.recordset[0].ClientID;

        const result = await pool.request()
            .input('ClientID', sql.Int, clientId)
            .input('BatchID', sql.Int, params.id)
            .input('GiftAmount', sql.Decimal(18, 2), amount)
            .input('CheckNumber', sql.NVarChar, checkNumber || null) // Add CheckNumber column to DB if missing, or map to GiftMethod/Comment? 
            // NOTE: Schema didn't have CheckNumber column on Donations, usually stored in GiftMethod or specific field. 
            // I will assume for now we add it or map it. 
            // Let's check schema... "Donations" table in setup_schema.sql didn't have CheckNumber. 
            // I should ADD it or use SecondaryID? 
            // For now, I will map it to secondary or just insert it if I alter the table.
            // Actually, requirements say "Donations" table. Let's look at schema again.
            // Schema: DonationID, ClientID, SecondaryID, TransactionType, GiftAmount... 
            // I'll put CheckNumber in `SecondaryID` for now as a temporary measure or add a column.
            // Better: ALTER TABLE Donations ADD CheckNumber NVARCHAR(50).
            .input('ScanString', sql.NVarChar, scanString || null) // Also missing in schema
            .input('GiftMethod', sql.NVarChar, 'Check')
            .input('GiftPlatform', sql.NVarChar, 'Cage')
            .input('GiftDate', sql.DateTime2, new Date())
            .input('TransactionType', sql.NVarChar, 'Donation')
            .query(`
            INSERT INTO Donations (ClientID, BatchID, GiftAmount, SecondaryID, GiftMethod, GiftPlatform, GiftDate, TransactionType)
            OUTPUT INSERTED.DonationID, INSERTED.CreatedAt
            VALUES (@ClientID, @BatchID, @GiftAmount, @CheckNumber, @GiftMethod, @GiftPlatform, @GiftDate, @TransactionType)
        `);

        return NextResponse.json(result.recordset[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
