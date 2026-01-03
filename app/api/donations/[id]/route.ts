import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            // Fields to update
            GiftAmount, SecondaryID, CheckNumber, ScanString,
            GiftMethod, GiftPlatform, GiftType, GiftYear, GiftQuarter,
            DonorPrefix, DonorFirstName, DonorMiddleName, DonorLastName, DonorSuffix,
            DonorAddress, DonorCity, DonorState, DonorZip,
            DonorEmployer, DonorOccupation,
            GiftPledgeAmount, GiftFee, GiftCustodian, GiftConduit,
            PostMarkYear, PostMarkQuarter, IsInactive, Comment,
            DonorPhone, DonorEmail, OrganizationName
        } = body;

        // Note: We map frontend props to DB columns
        const result = await query(
            `UPDATE "Donations" SET
                "GiftAmount" = $1,
                "SecondaryID" = $2,
                "CheckNumber" = $3,
                "ScanString" = $4,
                "GiftMethod" = $5,
                "GiftPlatform" = $6,
                "GiftType" = $7,
                "GiftYear" = $8,
                "GiftQuarter" = $9,
                "DonorPrefix" = $10,
                "DonorFirstName" = $11,
                "DonorMiddleName" = $12,
                "DonorLastName" = $13,
                "DonorSuffix" = $14,
                "DonorAddress" = $15,
                "DonorCity" = $16,
                "DonorState" = $17,
                "DonorZip" = $18,
                "DonorEmployer" = $19,
                "DonorOccupation" = $20,
                "GiftPledgeAmount" = $21,
                "GiftFee" = $22,
                "GiftCustodian" = $23,
                "GiftConduit" = $24,
                "PostMarkYear" = $25,
                "PostMarkQuarter" = $26,
                "IsInactive" = $27,
                "Comment" = $28,
                "DonorPhone" = $29,
                "DonorEmail" = $30,
                "OrganizationName" = $31
            WHERE "DonationID" = $32
            RETURNING *`,
            [
                GiftAmount, SecondaryID, CheckNumber, ScanString,
                GiftMethod, GiftPlatform, GiftType, GiftYear, GiftQuarter,
                DonorPrefix, DonorFirstName, DonorMiddleName, DonorLastName, DonorSuffix,
                DonorAddress, DonorCity, DonorState, DonorZip,
                DonorEmployer, DonorOccupation,
                GiftPledgeAmount, GiftFee, GiftCustodian, GiftConduit,
                PostMarkYear, PostMarkQuarter, IsInactive, Comment,
                DonorPhone, DonorEmail, OrganizationName,
                id
            ]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/donations/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
