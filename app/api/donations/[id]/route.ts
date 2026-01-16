import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { verifyDonationAccess, UserSession } from '@/lib/auth-helpers';
import { formatName, formatAddress, formatState, formatZip, formatEmail, formatPhone, cleanText } from '@/lib/cleaners';

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
            TransactionType, // New Field
            DonorPrefix, DonorFirstName, DonorMiddleName, DonorLastName, DonorSuffix,
            DonorAddress, DonorCity, DonorState, DonorZip,
            DonorEmployer, DonorOccupation,
            GiftPledgeAmount, GiftFee, GiftCustodian, GiftConduit,
            PostMarkYear, PostMarkQuarter, IsInactive, Comment,
            DonorPhone, DonorEmail, OrganizationName
        } = body;

        // 4. Fetch existing record and Check Batch Status
        const existingRes = await query(`
            SELECT d.*, b."Status" as "BatchStatus" 
            FROM "Donations" d
            LEFT JOIN "Batches" b ON d."BatchID" = b."BatchID"
            WHERE d."DonationID" = $1
        `, [id]);

        if (existingRes.rows.length === 0) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }
        const current = existingRes.rows[0];

        // CRITICAL: Integrity Lock
        // Prevent editing if the batch is already closed or reconciled
        if (current.BatchStatus === 'Closed' || current.BatchStatus === 'Reconciled') {
            return NextResponse.json({
                error: `Cannot edit donation. Batch status is '${current.BatchStatus}'.`
            }, { status: 403 });
        }

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
        const withClean = (v: any, fn: (s: string) => string | null, cur?: any) => v === undefined ? undefined : fn(v);

        const result = await query(
            `UPDATE "Donations" SET
                "GiftAmount" = $1,
                "SecondaryID" = $2,
                "ScanString" = $3,
                "GiftMethod" = $4,
                "GiftPlatform" = $5,
                "GiftType" = $6,
                "GiftYear" = $7,
                "GiftQuarter" = $8,
                "DonorEmail" = $9,
                "DonorPhone" = $10,
                "OrganizationName" = $11,

                "DonorPrefix" = $12,
                "DonorFirstName" = $13,
                "DonorMiddleName" = $14,
                "DonorLastName" = $15,
                "DonorSuffix" = $16,
                "DonorAddress" = $17,
                "DonorCity" = $18,
                "DonorState" = $19,
                "DonorZip" = $20,
                "DonorEmployer" = $21,
                "DonorOccupation" = $22,
                
                "GiftPledgeAmount" = $23,
                "GiftFee" = $24,
                "GiftCustodian" = $25,
                "GiftConduit" = $26,
            
                "PostMarkYear" = $27,
                "PostMarkQuarter" = $28,
                "IsInactive" = $29,
                "Comment" = $30,
                "TransactionType" = COALESCE($31, "TransactionType"),
                "RoutingNumber" = COALESCE($32, "RoutingNumber"),
                "AccountNumber" = COALESCE($33, "AccountNumber"),
                "CheckSequenceNumber" = COALESCE($34, "CheckSequenceNumber"),
                "AuxOnUs" = COALESCE($35, "AuxOnUs"),
                "EPC" = COALESCE($36, "EPC"),
                "Version" = COALESCE("Version", 1) + 1  -- Increment Version
            WHERE "DonationID" = $37
            RETURNING *`,
            [
                val(GiftAmount, current.GiftAmount),
                val(SecondaryID, current.SecondaryID),
                val(ScanString, current.ScanString),
                val(GiftMethod, current.GiftMethod),
                val(GiftPlatform, current.GiftPlatform),
                val(GiftType, current.GiftType),
                val(GiftYear, current.GiftYear),
                val(GiftQuarter, current.GiftQuarter),
                val(withClean(DonorEmail, formatEmail), current.DonorEmail),
                val(withClean(DonorPhone, formatPhone), current.DonorPhone),
                val(OrganizationName, current.OrganizationName),

                val(DonorPrefix, current.DonorPrefix),
                val(withClean(DonorFirstName, formatName), current.DonorFirstName),
                val(withClean(DonorMiddleName, formatName), current.DonorMiddleName),
                val(withClean(DonorLastName, formatName), current.DonorLastName),
                val(withClean(DonorSuffix, cleanText), current.DonorSuffix),
                val(withClean(DonorAddress, formatAddress), current.DonorAddress),
                val(withClean(DonorCity, formatName), current.DonorCity),
                val(withClean(DonorState, formatState), current.DonorState),
                val(withClean(DonorZip, formatZip), current.DonorZip),
                val(withClean(DonorEmployer, formatName), current.DonorEmployer),
                val(withClean(DonorOccupation, formatName), current.DonorOccupation),
                val(GiftPledgeAmount, current.GiftPledgeAmount),
                val(GiftFee, current.GiftFee),
                val(GiftCustodian, current.GiftCustodian),
                val(GiftConduit, current.GiftConduit),
                val(PostMarkYear, current.PostMarkYear),
                val(PostMarkQuarter, current.PostMarkQuarter),
                val(IsInactive, current.IsInactive),
                val(Comment, current.Comment),
                val(TransactionType, current.TransactionType),
                val(body.RoutingNumber, current.RoutingNumber),
                val(body.AccountNumber, current.AccountNumber),
                val(body.CheckSequenceNumber, current.CheckSequenceNumber),
                val(body.AuxOnUs, current.AuxOnUs),
                val(body.EPC, current.EPC),
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
