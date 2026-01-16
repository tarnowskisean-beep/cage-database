
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { formatName, formatAddress, formatState, formatZip, cleanText, formatEmail, formatPhone } from '@/lib/cleaners';
import { findAssignedUser } from '@/lib/assignment-rules';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('POST /api/save-donation Body:', JSON.stringify(body, null, 2));

        // Clean & Standardize Inputs
        const donorFirstName = formatName(body.donorFirstName);
        const donorMiddleName = formatName(body.donorMiddleName);
        const donorLastName = formatName(body.donorLastName);
        const donorSuffix = cleanText(body.donorSuffix);
        const donorAddress = formatAddress(body.donorAddress);
        const donorCity = formatName(body.donorCity);
        const donorState = formatState(body.donorState);
        const donorZip = formatZip(body.donorZip);
        const donorEmployer = formatName(body.donorEmployer);
        const donorOccupation = formatName(body.donorOccupation);

        const {
            amount, checkNumber, scanString, giftMethod, giftPlatform, giftType, giftYear, giftQuarter,
            donorEmail, donorPhone, organizationName,
            // (Used above clean variables instead of direct body access)
            donorPrefix,
            giftPledgeAmount, giftFee, giftCustodian, giftConduit,
            postMarkYear, postMarkQuarter, isInactive, comment,
            campaignId,
            // EXTRACT BATCH ID FROM BODY
            batchId
        } = body;

        if (!batchId) {
            return NextResponse.json({ error: 'BatchID is required in body' }, { status: 400 });
        }

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
        const finalType = giftType || batch.DefaultGiftType || 'Individual/Trust/IRA';
        const finalTransactionType = body.transactionType || batch.DefaultTransactionType || 'Contribution';

        const assignedToUserID = await findAssignedUser({
            amount,
            donorState,
            donorZip,
            campaignId: campaignId || ''
        });

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
             "CampaignID", "ResolutionStatus", "AssignedToUserID", "IsFlagged",
             "RoutingNumber", "AccountNumber", "CheckSequenceNumber", "AuxOnUs", "EPC"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)
            RETURNING *`,
            [
                batch.ClientID,
                batchId,
                amount,
                checkNumber, // SecondaryID
                checkNumber, // CheckNumber
                scanString,
                finalTransactionType,
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
                campaignId || '', // Fail-safe (Mapped to CampaignID)
                'Resolved', // ResolutionStatus defaults to Resolved, Dedup logic is separate process
                assignedToUserID, // $38
                body.resolutionStatus === 'Pending', // $39 IsFlagged
                body.routingNumber, // $40
                body.accountNumber, // $41
                body.checkSequenceNumber, // $42
                body.auxOnUs, // $43
                body.epc // $44
            ]
        );

        const newDonation = result.rows[0];

        // LOG AUDIT (SOC 2)
        await logAudit(
            (session.user as any).id,
            'CreateDonation',
            newDonation.DonationID,
            { batchId: batchId, amount: amount, client: batch.ClientID }
        );

        return NextResponse.json(newDonation);
    } catch (error: any) {
        console.error('POST /api/save-donation error:', error);
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
