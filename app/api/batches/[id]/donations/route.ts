import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = await query(`
        SELECT "DonationID", "GiftAmount", "CheckNumber", "SecondaryID", "ScanString", "CreatedAt", "GiftMethod"
        FROM "Donations" 
        WHERE "BatchID" = $1 
        ORDER BY "CreatedAt" DESC
      `, [id]);
        const rows = result.rows.map(row => ({
            ...row,
            GiftAmount: parseFloat(row.GiftAmount)
        }));
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await request.json();
        const { amount, checkNumber, scanString } = body;
        const { id } = await params;

        // Get ClientID and Defaults from Batch
        const batchRes = await query('SELECT "ClientID", "DefaultGiftMethod", "DefaultGiftPlatform", "DefaultTransactionType", "DefaultGiftYear", "DefaultGiftQuarter" FROM "Batches" WHERE "BatchID" = $1', [id]);

        if (batchRes.rows.length === 0) throw new Error('Batch not found');
        const batch = batchRes.rows[0];

        const result = await query(`
            INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType", "GiftYear", "GiftQuarter")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)
            RETURNING "DonationID", "CreatedAt", "GiftAmount"
        `, [
            batch.ClientID,
            id,
            amount,
            checkNumber || null,
            checkNumber || null,
            scanString || null,
            batch.DefaultGiftMethod || 'Check',
            batch.DefaultGiftPlatform || 'Cage',
            batch.DefaultTransactionType || 'Donation',
            batch.DefaultGiftYear,
            batch.DefaultGiftQuarter
        ]);

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
