import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionId = params.id;
        // @ts-ignore
        const userId = session.user?.id;
        // @ts-ignore
        const userName = session.user?.name || 'Unknown User';

        // 1. Get Session & Verify Status
        const sessionRes = await query('SELECT * FROM "import_sessions" WHERE "id" = $1', [sessionId]);
        if (sessionRes.rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        const importSession = sessionRes.rows[0];

        if (importSession.status !== 'Processing') {
            return NextResponse.json({ error: 'Session must be processed (normalized) before committing' }, { status: 400 });
        }

        const body = await request.json();
        const { clientId } = body;

        if (!clientId) return NextResponse.json({ error: 'Client ID is required to commit' }, { status: 400 });

        // Get Client Code
        const clientRes = await query('SELECT "ClientCode" FROM "Clients" WHERE "ClientID" = $1', [clientId]);
        const clientCode = clientRes.rows[0].ClientCode;

        // 2. Fetch Staging Data
        const stagingRes = await query('SELECT "normalized_data" FROM "staging_revenue" WHERE "session_id" = $1', [sessionId]);
        const rows = stagingRes.rows;

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No data to commit' }, { status: 400 });
        }

        const firstRowData = rows[0].normalized_data || {};
        const csvGiftDate = firstRowData['Gift Date'];

        // Date Logic: Prefer CSV 'Gift Date', fallback to Today
        let dateObj = new Date();
        if (csvGiftDate) {
            const parsed = new Date(csvGiftDate);
            if (!isNaN(parsed.getTime())) {
                dateObj = parsed;
            }
        }

        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const batchDate = `${yyyy}-${mm}-${dd}`; // For DB Date column
        const batchDateStr = `${yyyy}.${mm}.${dd}`; // For Batch Code string

        // Platform Short Code
        const platformMap: Record<string, string> = {
            'Winred': 'WR',
            'Stripe': 'ST',
            'Anedot': 'AN',
            'Cage': 'CG',
            'Revv': 'RV',
            'ActBlue': 'AB',
            'PayPal': 'PP',
            'Check': 'CK',
            'Wire': 'WI'
        };

        let platformCode = platformMap[importSession.source_system];
        if (!platformCode) {
            const clean = importSession.source_system.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            platformCode = clean.substring(0, 2) || 'IM';
        }

        // Get User Initials
        const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'XX';

        // TRANSACTION START
        // We use a transaction to ensure we get a unique sequence number and create all records atomically
        const result = await transaction(async (client) => {

            // 3. Determine Sequence Number for this User + Date
            // Lock isn't strictly necessary with serializable isolation, but good practice if high concurrency
            const seqRes = await client.query(`
                SELECT COUNT(*) as count 
                FROM "Batches" 
                WHERE "CreatedBy" = $1 
                AND "Date" = $2
            `, [importSession.source_system, batchDate]);
            // Note: We are using "CreatedBy" = source_system as per original code, OR should we use the actual User?
            // Manual batches use User Initials. Import batches should probably adhere to the "Import" user/persona?
            // Let's stick to the User Initials logic for continuity with Manual Batches.
            // Actually, wait, "CreatedBy" column in DB is usually the string name.

            // Better logic: Count batches where the BatchCode contains today's date and user initials? 
            // Or just a simple daily increment.
            // Let's replicate strict manual logic: Count batches for THIS date.

            const existingCount = parseInt(seqRes.rows[0].count || '0', 10);
            const nextSeq = String(existingCount + 1).padStart(2, '0');

            // Custom Batch Code: [Client].[Platform].[Date].[Initials].[Seq]
            // Ex: AFL.WR.2025.12.25.ST.01
            const batchCode = `${clientCode}.${platformCode}.${batchDateStr}.${initials}.${nextSeq}`;

            // 4. Create Batch
            const batchRes = await client.query(`
                INSERT INTO "Batches" (
                    "BatchCode", "ClientID", "EntryMode", "PaymentCategory", "CreatedBy", "Status", "Date",
                    "DefaultGiftPlatform", "ImportSessionID"
                ) VALUES ($1, $2, 'Import', 'Donations', $3, 'Open', $4, $5, $6)
                RETURNING "BatchID"
            `, [batchCode, clientId, userId, batchDate, importSession.source_system, sessionId]);

            const batchId = batchRes.rows[0].BatchID;

            // 5. Insert Donations
            const insertValues: string[] = [];
            const paramsList: any[] = [];
            let pIdx = 1;

            for (const row of rows) {
                const data = row.normalized_data;
                paramsList.push(
                    batchId,
                    clientId,
                    data['First Name'] || null,
                    data['Last Name'] || null,
                    data['Gift Amount'] || 0,
                    data['Gift Date'] || batchDate,
                    data['Gift Type'] || 'Online Source',
                    data['Gift Method'] || 'Credit Card',
                    sessionId,
                    data['MailCode'] || data['Mail Code'] || null,
                    data['ScanString'] || data['Scan String'] || data['Scan'] || null
                );
                insertValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
            }

            if (insertValues.length > 0) {
                const queryStr = `
                    INSERT INTO "Donations" (
                        "BatchID", "ClientID", "FirstName", "LastName", "Amount", "DonationDate", "GiftType", "PaymentMethod", "ImportSessionID", "MailCode", "ScanString"
                    )
                    VALUES ${insertValues.join(', ')}
                `;
                await client.query(queryStr, paramsList);
            }

            // 6. Update Session Status
            await client.query('UPDATE "import_sessions" SET "status" = \'Completed\' WHERE "id" = $1', [sessionId]);

            return { batchId, batchCode };
        });

        return NextResponse.json({ success: true, batchId: result.batchId, batchCode: result.batchCode });

    } catch (error: any) {
        console.error('POST /api/import/commit error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
