import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const result = await query(`
        SELECT "DonationID", "GiftAmount", "CheckNumber", "SecondaryID", "ScanString", "CreatedAt", "GiftMethod"
        FROM "Donations" 
        WHERE "BatchID" = $1 
        ORDER BY "CreatedAt" DESC
      `, [params.id]);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { amount, checkNumber, scanString } = body;

        // Get ClientID from Batch
        const batchRes = await query('SELECT "ClientID" FROM "Batches" WHERE "BatchID" = $1', [params.id]);

        if (batchRes.rows.length === 0) throw new Error('Batch not found');
        const clientId = batchRes.rows[0].ClientID;

        const result = await query(`
            INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType")
            VALUES ($1, $2, $3, $4, $5, $6, 'Check', 'Cage', NOW(), 'Donation')
            RETURNING "DonationID", "CreatedAt", "GiftAmount"
        `, [
            clientId,
            params.id,
            amount,
            checkNumber || null, // SecondaryID can double as check num or be distinct, Postgres schema has CheckNumber column now
            checkNumber || null,
            scanString || null
        ]);

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
