import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionId = params.id;
        const userId = (session.user as any).id;

        // 1. Get Session & Verify Status
        const sessionRes = await query('SELECT * FROM "import_sessions" WHERE "id" = $1', [sessionId]);
        if (sessionRes.rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        const importSession = sessionRes.rows[0];

        // We accept 'Processing' as the state where rules are applied but not yet committed.
        if (importSession.status !== 'Processing') {
            return NextResponse.json({ error: 'Session must be processed (normalized) before committing' }, { status: 400 });
        }

        // 2. Create a New Batch for this Import
        // We'll use a special "Import" batch code format or just standard format
        // For simplicity, let's reuse standard logic but hardcode "Import" platform
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const batchDate = `${yyyy}-${mm}-${dd}`;

        // Generate Batch Code (Simplified for Import - reusing Logic API would be better but keeping it self-contained for speed)
        // Let's assume User has a valid ClientID. We might need to ask the user for ClientID in the Import Wizard?
        // Wait! The import wizard didn't ask for Client!
        // CRITICAL MISSING INFO: We need a ClientID to create a batch.
        // For now, let's assume we pass ClientID in the body of the Commit request.

        const body = await request.json();
        const { clientId } = body;

        if (!clientId) return NextResponse.json({ error: 'Client ID is required to commit' }, { status: 400 });

        // Get Client Code
        const clientRes = await query('SELECT "ClientCode" FROM "Clients" WHERE "ClientID" = $1', [clientId]);
        const clientCode = clientRes.rows[0].ClientCode;

        // 2. Fetch Staging Data (Need one row to determine Batch Code suffix from External Batch ID)
        const stagingRes = await query('SELECT "normalized_data" FROM "staging_revenue" WHERE "session_id" = $1', [sessionId]);
        const rows = stagingRes.rows;

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No data to commit' }, { status: 400 });
        }

        const firstRowData = rows[0].normalized_data || {};
        const externalBatchId = firstRowData['External Batch ID'];

        // Suffix: Right 6 digits of External Batch ID, or fallback to Session ID
        let suffix = String(sessionId);
        if (externalBatchId && typeof externalBatchId === 'string' && externalBatchId.length >= 6) {
            suffix = externalBatchId.slice(-6);
        } else if (externalBatchId) {
            suffix = String(externalBatchId);
        }

        // Platform Short Code
        const platformMap: Record<string, string> = {
            'Winred': 'WR',
            'Stripe': 'STR',
            'Anedot': 'AND',
            'Cage': 'CAGE',
            'Revv': 'REVV',
            'ActBlue': 'AB'
        };
        const platformCode = platformMap[importSession.source_system] || 'IMP';

        // Custom Batch Code: [Client].[Platform].[Date].[Suffix]
        // Ex: AFL.WR.2025.12.25.nijn33
        const batchCode = `${clientCode}.${platformCode}.${yyyy}.${mm}.${dd}.${suffix}`;

        // Create Batch
        const batchRes = await query(`
            INSERT INTO "Batches" (
                "BatchCode", "ClientID", "EntryMode", "PaymentCategory", "CreatedBy", "Status", "Date",
                "DefaultGiftPlatform", "ImportSessionID"
            ) VALUES ($1, $2, 'Import', 'Donations', $3, 'Open', $4, $5, $6)
            RETURNING "BatchID"
        `, [batchCode, clientId, userId, batchDate, importSession.source_system, sessionId]);

        const batchId = batchRes.rows[0].BatchID;

        // 3. Move Data from Staging to Donations
        // We iterate and map 'normalized_data' JSON fields to table columns
        // const stagingRes = await query('SELECT "normalized_data" FROM "staging_revenue" WHERE "session_id" = $1', [sessionId]);
        // const rows = stagingRes.rows; (Already fetched above)

        const insertValues: string[] = [];
        const paramsList: any[] = [];
        let pIdx = 1;

        for (const row of rows) {
            const data = row.normalized_data;

            // Map JSON keys to DB columns
            // This mapping MUST match your 'target_column' names in mapping_rules
            paramsList.push(
                batchId,
                clientId,
                data['First Name'] || null,
                data['Last Name'] || null,
                data['Gift Amount'] || 0,
                data['Gift Date'] || batchDate,
                data['Gift Type'] || 'Online Source',
                data['Gift Method'] || 'Credit Card'
            );

            insertValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
        }

        if (insertValues.length > 0) {
            // Note: Postgres has a parameter limit (around 65k). large imports need chunking.
            // For this demo, we assume small batches.
            const queryStr = `
                INSERT INTO "Donations" (
                    "BatchID", "ClientID", "FirstName", "LastName", "Amount", "DonationDate", "GiftType", "PaymentMethod"
                )
                VALUES ${insertValues.join(', ')}
            `;
            await query(queryStr, paramsList);
        }

        // 4. Update Session Status
        await query('UPDATE "import_sessions" SET "status" = \'Completed\' WHERE "id" = $1', [sessionId]);

        return NextResponse.json({ success: true, batchId, batchCode });

    } catch (error: any) {
        console.error('POST /api/import/commit error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
