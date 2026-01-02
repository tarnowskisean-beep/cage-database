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
        const { amount, checkNumber, scanString, giftMethod, giftPlatform, giftType, giftYear, giftQuarter, donorEmail, donorPhone, organizationName } = body;
        const { id: batchId } = await params; // Renamed 'id' to 'batchId' to avoid conflict with batch.ClientID

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        // Get ClientID and Defaults from Batch
        const batchRes = await query('SELECT "ClientID", "DefaultGiftMethod", "DefaultGiftPlatform", "DefaultTransactionType", "DefaultGiftYear", "DefaultGiftQuarter", "DefaultGiftType", "Date" FROM "Batches" WHERE "BatchID" = $1', [batchId]);

        if (batchRes.rows.length === 0) throw new Error('Batch not found');
        const batch = batchRes.rows[0];

        // Apply Defaults if missing
        const finalMethod = giftMethod || batch.DefaultGiftMethod || 'Check';
        const finalPlatform = giftPlatform || batch.DefaultGiftPlatform || 'Cage';
        const finalType = giftType || batch.DefaultGiftType || 'Individual';

        const result = await query(
            `INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", 
             "TransactionType", "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate",
             "GiftType", "GiftYear", "GiftQuarter", 
             "DonorEmail", "DonorPhone", "OrganizationName")
            VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, NOW(), $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                batch.ClientID,
                batchId,
                amount,
                checkNumber, // SecondaryID
                checkNumber, // CheckNumber
                scanString,
                finalMethod,
                finalPlatform,
                batch.Date, // BatchDate
                finalType,
                giftYear || batch.DefaultGiftYear, // Use provided giftYear or batch default
                giftQuarter || batch.DefaultGiftQuarter, // Use provided giftQuarter or batch default
                donorEmail,
                donorPhone,
                String(organizationName || '')
            ]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
