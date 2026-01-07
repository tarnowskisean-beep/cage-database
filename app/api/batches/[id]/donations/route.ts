import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';
import { formatName, formatAddress, formatState, formatZip, cleanText, formatEmail, formatPhone } from '@/lib/cleaners';
import { CreateDonationSchema } from '@/lib/schemas';
import { resolveDonationIdentity } from '@/lib/people';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params before destructuring
        const result = await query(`
        SELECT "DonationID", "GiftAmount", "CheckNumber", "SecondaryID", "ScanString", "CreatedAt", "GiftMethod",
               "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix", 
               "DonorAddress", "DonorCity", "DonorState", "DonorZip", "DonorEmployer", "DonorOccupation",
               "GiftPledgeAmount", "GiftFee", "GiftCustodian", "GiftConduit",
               "ReceiptYear", "ReceiptQuarter", "IsInactive", "Comment",
               "CampaignID",
               "ScanDocumentID", "ScanPageNumber"
        FROM "Donations" 
        WHERE "BatchID" = $1 
        ORDER BY "CreatedAt" DESC
      `, [id]);
        const rows = result.rows.map(row => ({
            ...row,
            GiftAmount: parseFloat(row.GiftAmount)
        }));
        return NextResponse.json(rows);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
}

async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Validation (Zod)
        const validation = CreateDonationSchema.safeParse(await request.json());
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation Failed', details: validation.error.format() }, { status: 400 });
        }
        const body = validation.data;

        // Clean & Standardize Inputs
        const donorFirstName = formatName(body.donorFirstName || '');
        const donorMiddleName = formatName(body.donorMiddleName || '');
        const donorLastName = formatName(body.donorLastName || '');
        const donorSuffix = cleanText(body.donorSuffix || '');
        const donorAddress = formatAddress(body.donorAddress || '');
        const donorCity = formatName(body.donorCity || '');
        const donorState = formatState(body.donorState || '');
        const donorZip = formatZip(body.donorZip || '');
        const donorEmployer = formatName(body.donorEmployer || '');
        const donorOccupation = formatName(body.donorOccupation || '');

        const {
            amount, checkNumber, scanString, giftMethod, giftPlatform, giftType, giftYear, giftQuarter,
            donorEmail, donorPhone, organizationName,
            // (Used above clean variables instead of direct body access)
            donorPrefix,
            giftPledgeAmount, giftFee, giftCustodian, giftConduit,
            postMarkYear, postMarkQuarter, isInactive, comment,
            campaignId
        } = body;
        const { id: batchId } = await params; // Await params before destructuring

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        // Get ClientID and Defaults from Batch
        const batchRes = await query('SELECT "ClientID", "DefaultGiftMethod", "DefaultGiftPlatform", "DefaultTransactionType", "DefaultGiftYear", "DefaultGiftQuarter", "DefaultGiftType", "Date", "Status" FROM "Batches" WHERE "BatchID" = $1', [batchId]);

        if (batchRes.rows.length === 0) throw new Error('Batch not found');
        const batch = batchRes.rows[0];

        if (batch.Status !== 'Open') {
            return NextResponse.json({ error: 'Cannot add donations to a Closed or Reconciled batch.' }, { status: 400 });
        }

        // Apply Defaults if missing
        const finalMethod = giftMethod || batch.DefaultGiftMethod || 'Check';
        const finalPlatform = giftPlatform || batch.DefaultGiftPlatform || 'Cage';
        const finalType = giftType || batch.DefaultGiftType || 'Individual';

        const result = await query(
            `INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", 
             "TransactionType", "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate",
             "GiftType", "GiftYear", "GiftQuarter", 
             "DonorEmail", "DonorPhone", "OrganizationName",
             "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
             "DonorAddress", "DonorCity", "DonorState", "DonorZip",
             "DonorEmployer", "DonorOccupation",
             "GiftPledgeAmount", "GiftFee", "GiftCustodian", "GiftConduit",
             "ReceiptYear", "ReceiptQuarter", "IsInactive", "Comment",
             "CampaignID"
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
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
                giftYear || batch.DefaultGiftYear,
                giftQuarter || batch.DefaultGiftQuarter,
                donorEmail,
                donorPhone,
                String(organizationName || ''),
                // New Fields Mapped to Params (Using Standardized Variables)
                donorPrefix, donorFirstName, donorMiddleName, donorLastName, donorSuffix,
                donorAddress, donorCity, donorState, donorZip,
                donorEmployer, donorOccupation,
                giftPledgeAmount || 0, giftFee || 0, giftCustodian, giftConduit,
                postMarkYear, postMarkQuarter, isInactive || false, comment,
                campaignId || '' // Fail-safe
            ]
        );

        const insertedDonation = result.rows[0];

        // Real-time Identity Resolution
        try {
            await resolveDonationIdentity(insertedDonation);
            // Re-fetch to get the updated DonorID? Or just trust it worked? 
            // The frontend might need the DonorID.
            // Let's re-fetch or manually attach if we want to be perfect, 
            // but for now the user just wants it resolved.
        } catch (e) {
            console.error('Identity Resolution failed:', e);
        }

        return NextResponse.json(insertedDonation);
    } catch (error: any) {
        console.error('POST /api/batches/[id]/donations error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.detail || error.code || 'No details'
        }, { status: 500 });
    }
}

export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
