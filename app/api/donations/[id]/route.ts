import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { verifyDonationAccess, UserSession } from '@/lib/auth-helpers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Authorization (RBAC)
        // Cast session user to our type which includes allowedClientIds
        const user: UserSession = session.user as any;
        const hasAccess = await verifyDonationAccess(user, id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
        }

        // 3. Optimistic Locking Check
        // Frontend must send 'version' in body. If missing, we assume force update (or legacy client)
        // ideally checking version should be mandatory.
        const providedVersion = body.Version;

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


        // 4. Fetch existing record
        const existingRes = await query('SELECT * FROM "Donations" WHERE "DonationID" = $1', [id]);
        if (existingRes.rows.length === 0) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }
        const current = existingRes.rows[0];

        // 5. Version Check
        if (providedVersion !== undefined && providedVersion !== null) {
            if (current.Version !== providedVersion) {
                return NextResponse.json({
                    error: 'Conflict: Data has been modified by another user.',
                    currentVersion: current.Version
                }, { status: 409 });
            }
        }

        // 6. Merge existing data
        const val = (v: any, cur: any) => v === undefined ? cur : v;

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
                "OrganizationName" = $31,
                "Version" = COALESCE("Version", 1) + 1  -- Increment Version
            WHERE "DonationID" = $32
            RETURNING *`,
            [
                val(GiftAmount, current.GiftAmount),
                val(SecondaryID, current.SecondaryID),
                val(CheckNumber, current.CheckNumber),
                val(ScanString, current.ScanString),
                val(GiftMethod, current.GiftMethod),
                val(GiftPlatform, current.GiftPlatform),
                val(GiftType, current.GiftType),
                val(GiftYear, current.GiftYear),
                val(GiftQuarter, current.GiftQuarter),
                val(DonorPrefix, current.DonorPrefix),
                val(DonorFirstName, current.DonorFirstName),
                val(DonorMiddleName, current.DonorMiddleName),
                val(DonorLastName, current.DonorLastName),
                val(DonorSuffix, current.DonorSuffix),
                val(DonorAddress, current.DonorAddress),
                val(DonorCity, current.DonorCity),
                val(DonorState, current.DonorState),
                val(DonorZip, current.DonorZip),
                val(DonorEmployer, current.DonorEmployer),
                val(DonorOccupation, current.DonorOccupation),
                val(GiftPledgeAmount, current.GiftPledgeAmount),
                val(GiftFee, current.GiftFee),
                val(GiftCustodian, current.GiftCustodian),
                val(GiftConduit, current.GiftConduit),
                val(PostMarkYear, current.PostMarkYear),
                val(PostMarkQuarter, current.PostMarkQuarter),
                val(IsInactive, current.IsInactive),
                val(Comment, current.Comment),
                val(DonorPhone, current.DonorPhone),
                val(DonorEmail, current.DonorEmail),
                val(OrganizationName, current.OrganizationName),
                id
            ]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Donation not found or Update Failed' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('PUT /api/donations/[id] error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
