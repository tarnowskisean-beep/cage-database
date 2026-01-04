
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from 'fs';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const filePath = '/Users/seantarnowski/Downloads/DonationT_Combined_cleaned.csv';

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found at ' + filePath }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Parse CSV
        const parsed = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim()
        });

        if (parsed.errors.length > 0 && parsed.data.length === 0) {
            return NextResponse.json({ error: 'CSV Parse Error', details: parsed.errors }, { status: 400 });
        }

        const rows = parsed.data as any[];
        console.log(`Parsed ${rows.length} rows.`);

        // caches
        const clientsCache = new Map<string, number>(); // Code -> ID
        const batchesCache = new Map<string, number>(); // Key (ClientID-BatchCode-Date) -> ID

        // 1. Pre-load Clients
        const dbClients = await query('SELECT "ClientID", "ClientCode" FROM "Clients"');
        dbClients.rows.forEach(r => clientsCache.set(r.ClientCode, r.ClientID));

        let importedCount = 0;
        let batchCount = 0;
        let clientCount = 0;

        // Process Rows
        for (const row of rows) {
            const clientCode = row['ClientID']; // "AFL"
            if (!clientCode) continue;

            // Resolve Client
            let clientId = clientsCache.get(clientCode);
            if (!clientId) {
                // Create Client
                const res = await query(
                    'INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType") VALUES ($1, $2, $3) RETURNING "ClientID"',
                    [clientCode, clientCode, 'Standard'] // Default Name = Code
                );
                clientId = res.rows[0].ClientID;
                clientsCache.set(clientCode, clientId!);
                clientCount++;
            }

            // Resolve Batch
            const batchCode = row['Batch'] || 'Default';
            const dateStr = row['Date Created'] || new Date().toISOString().split('T')[0];
            const batchKey = `${clientId}-${batchCode}-${dateStr}`;

            let batchId = batchesCache.get(batchKey);
            if (!batchId) {
                // Check DB (in case we missed cache or re-running)
                const existingBatch = await query(
                    'SELECT "BatchID" FROM "Batches" WHERE "ClientID" = $1 AND "BatchCode" = $2 AND "Date" = $3',
                    [clientId, batchCode, dateStr]
                );

                if (existingBatch.rows.length > 0) {
                    batchId = existingBatch.rows[0].BatchID;
                } else {
                    // Create Batch
                    const res = await query(
                        `INSERT INTO "Batches" 
                        ("ClientID", "BatchCode", "Date", "Status", "Description", "PaymentCategory", "EntryMode") 
                        VALUES ($1, $2, $3, 'Closed', 'Imported Batch', 'Mixed', 'Manual') 
                        RETURNING "BatchID"`,
                        [clientId, batchCode, dateStr]
                    );
                    batchId = res.rows[0].BatchID;
                    batchCount++;
                }
                batchesCache.set(batchKey, batchId!);
            }

            // Insert Donation
            const amountStr = row['Gift Amount'] || '0';
            const amount = parseFloat(amountStr.replace(/[$,]/g, ''));

            const secondaryId = row['SecondaryID (CagingID or Import ID)'] || null;
            const comment = row['Comment'] || '';
            const checkNumber = (row['Gift Method'] === 'Check') ? (secondaryId || row['CompositeID']) : null; // Logic guess

            await query(
                `INSERT INTO "Donations"
                ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber",
                 "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
                 "DonorAddress", "DonorCity", "DonorState", "DonorZip",
                 "DonorEmail", "DonorPhone", "DonorOccupation", "DonorEmployer",
                 "GiftMethod", "GiftPlatform", "GiftType",
                 "GiftPledgeAmount", "GiftFee",
                 "PostMarkYear", "PostMarkQuarter", "IsInactive", 
                 "GiftDate", "BatchDate", "CreatedAt")
                VALUES
                ($1, $2, $3, $4, $5,
                 $6, $7, $8, $9, $10,
                 $11, $12, $13, $14,
                 $15, $16, $17, $18,
                 $19, $20, $21,
                 $22, $23,
                 $24, $25, $26,
                 $27, $28, NOW())`,
                [
                    clientId,
                    batchId,
                    amount,
                    secondaryId,
                    checkNumber,
                    // Name
                    row['Prefix'], row['First Name'], row['Middle Name'], row['Last Name'], row['Suffix'],
                    // Address
                    row['Address'], row['City'], row['State'], row['Zip'],
                    // Contact
                    row['Email'], row['Phone'], row['Occupation'], row['Employer'],
                    // Gift Details
                    row['Gift Method'], row['Gift Platform'], row['Gift Type'],
                    parseFloat((row['Pledge Amount'] || '0').replace(/[$,]/g, '')),
                    parseFloat((row['Gift Fee'] || '0').replace(/[$,]/g, '')),
                    // Postmark
                    parseInt(row['Postmark Year'] || '0') || null,
                    row['Postmark Quarter'],
                    row['Yes Inactive'] === 'TRUE',
                    // Dates
                    dateStr, // GiftDate = BatchDate for imports usually
                    dateStr
                ]
            );
            importedCount++;
        }

        return NextResponse.json({
            success: true,
            imported: importedCount,
            newClients: clientCount,
            newBatches: batchCount
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
