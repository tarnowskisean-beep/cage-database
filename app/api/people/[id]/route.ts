
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        // 1. Get Donor Profile
        const donorRes = await query(`
            SELECT 
                d.*,
                u."Username" as "AssignedStafferName",
                u."Initials" as "AssignedStafferInitials"
            FROM "Donors" d
            LEFT JOIN "Users" u ON d."AssignedStafferID" = u."UserID"
            WHERE d."DonorID" = $1
        `, [id]);

        if (donorRes.rows.length === 0) return NextResponse.json({ error: 'Donor not found' }, { status: 404 });
        const donor = donorRes.rows[0];

        // Generate Signed URL for Profile Picture if exists
        if (donor.ProfilePicture && process.env.GCS_BUCKET_NAME && process.env.GDRIVE_CREDENTIALS) {
            try {
                // Reuse Storage instance logic? Or import it? 
                // For now, inline to avoid large refactors, but ideally should be a lib function.
                const { Storage } = await import('@google-cloud/storage');
                const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
                const storage = new Storage({
                    projectId: credentials.project_id,
                    credentials,
                });
                const [signedUrl] = await storage
                    .bucket(process.env.GCS_BUCKET_NAME)
                    .file(donor.ProfilePicture)
                    .getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + 60 * 60 * 1000, // 1 hour
                    });
                donor.ProfilePictureUrl = signedUrl;
            } catch (e) {
                console.error('Error signing profile picture URL', e);
            }
        }

        // 2. Get Donation History
        const historyRes = await query(`
            SELECT 
                d."DonationID", d."GiftDate", d."GiftAmount", d."GiftMethod", d."GiftPlatform", 
                d."BatchID", d."CheckNumber", d."CampaignID",
                d."Designation", d."ThankYouSentAt", d."TaxReceiptSentAt",
                c."ClientName", c."ClientCode",
                a."AccountName",
                b."BatchCode",
                COALESCE(
                    (SELECT json_agg(img) FROM "DonationImages" img WHERE img."DonationID" = d."DonationID"),
                    '[]'::json
                ) as "Images"
            FROM "Donations" d
            LEFT JOIN "Clients" c ON d."ClientID" = c."ClientID"
            LEFT JOIN "Batches" b ON d."BatchID" = b."BatchID"
            LEFT JOIN "ClientBankAccounts" a ON b."AccountID" = a."AccountID"
            WHERE "DonorID" = $1
            ORDER BY "GiftDate" DESC
        `, [id]);

        const history = historyRes.rows;

        // 3. Get Pledges & Calculate Progress
        const pledgesRes = await query(`
            SELECT * FROM "Pledges" WHERE "DonorID" = $1 ORDER BY "CreatedAt" DESC
        `, [id]);

        const pledges = pledgesRes.rows.map(pledge => {
            const donated = history
                .filter(h => h.CampaignID === pledge.CampaignID)
                .reduce((sum, h) => sum + Number(h.GiftAmount), 0);
            return {
                ...pledge,
                donated,
                progress: pledge.Amount > 0 ? (donated / pledge.Amount) * 100 : 0
            };
        });

        // 4. Calculate Stats
        const totalGiven = history.reduce((acc, row) => acc + parseFloat(row.GiftAmount || 0), 0);
        const giftCount = history.length;
        const avgGift = giftCount > 0 ? totalGiven / giftCount : 0;

        // 5. Get Last Contact (from Notes)
        const notesRes = await query(`
            SELECT MAX("CreatedAt") as "LastContact" FROM "DonorNotes" WHERE "DonorID" = $1
        `, [id]);
        const lastContact = notesRes.rows[0]?.LastContact || null;

        // 6. Get Subscription Status
        const subRes = await query(`
            SELECT 1 FROM "DonorSubscriptions" WHERE "UserID" = $1 AND "DonorID" = $2
        `, [session.user.id || (session.user as any).UserID, id]);
        const isSubscribed = subRes.rows.length > 0;

        // 7. Get Tasks (Summary)
        const tasksRes = await query(`
            SELECT COUNT(*) as "PendingTasks" FROM "DonorTasks" WHERE "DonorID" = $1 AND "IsCompleted" = FALSE
        `, [id]);
        const pendingTasks = parseInt(tasksRes.rows[0]?.PendingTasks || '0');

        return NextResponse.json({
            profile: donor,
            stats: {
                totalGiven,
                giftCount,
                avgGift,
                lastContact,
                pendingTasks
            },
            history: history,
            pledges: pledges,
            isSubscribed
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const body = await req.json();
        const { FirstName, LastName, Email, Phone, Address, City, State, Zip, Bio, AssignedStafferID, ProfilePicture, AlertMessage, HasAlert } = body;

        // Ensure HasAlert is boolean
        const alertEnabled = HasAlert === true || HasAlert === 'true';

        await query(`
            UPDATE "Donors"
            SET "FirstName" = $1, "LastName" = $2, "Email" = $3, "Phone" = $4,
                "Address" = $5, "City" = $6, "State" = $7, "Zip" = $8,
                "Bio" = $9, "AssignedStafferID" = $10,
                "ProfilePicture" = COALESCE($12, "ProfilePicture"),
                "AlertMessage" = $13,
                "HasAlert" = $14,
                "UpdatedAt" = NOW()
            WHERE "DonorID" = $11
        `, [FirstName, LastName, Email, Phone, Address, City, State, Zip, Bio, AssignedStafferID || null, id, ProfilePicture, AlertMessage, alertEnabled]);

        // Audit Log
        logAudit(session.user.id || (session.user as any).UserID || 0, 'UPDATE_DONOR', id, {
            updatedFields: Object.keys(body),
            updatedBy: session.user.email
        }).catch(console.error);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
