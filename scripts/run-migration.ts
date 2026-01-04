
// This script is meant to be run via 'npx ts-node' or similar, but since we are in a web context,
// we'll make a Next.js route that triggers the internal logic directly or calls the other endpoints using localhost.
// Actually, since I have direct DB access in the other routes, I can just call the route handlers logic via a new "orchestrator" route
// or simpler: just use curl/fetch from the terminal tool to hit the endpoints I just made.

// BUT, those endpoints require Auth. 
// So I will make a temporary "Super Admin" script that bypasses auth just for this one-time CLI execution.
// OR, I can just write a script that imports 'query' and does it directly.

import { query } from '../lib/db';
import fs from 'fs';
import Papa from 'papaparse';

const CSV_PATH = '/Users/seantarnowski/Downloads/DonationT_Combined_cleaned.csv';

async function run() {
    console.log("🚀 STARTING MIGRATION...");

    // 1. RESET
    console.log("🗑️  Resetting Data...");
    await query('TRUNCATE TABLE "Donations" CASCADE');
    await query('TRUNCATE TABLE "BatchDocuments" CASCADE');
    await query('TRUNCATE TABLE "Batches" CASCADE');
    // We keep Clients? Actually, the import logic creates them if missing.
    // If the user wants a clean slate, maybe truncate Clients too?
    // User said "Current Data", implying transactions. I'll leave clients unless explicitly told otherwise to avoid nuking settings.
    console.log("✅ Data Reset Complete.");

    // 2. IMPORT
    console.log("📂 Reading CSV...");
    const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });

    const rows = parsed.data as any[];
    console.log(`📊 Found ${rows.length} rows to import.`);

    const clientsCache = new Map<string, number>();
    const batchesCache = new Map<string, number>();

    // Load existing clients
    const dbClients = await query('SELECT "ClientID", "ClientCode" FROM "Clients"');
    dbClients.rows.forEach(r => clientsCache.set(r.ClientCode, r.ClientID));

    let imported = 0;

    for (const [index, row] of rows.entries()) {
        if (index % 100 === 0) process.stdout.write(`\rProcessing row ${index}/${rows.length}...`);

        const clientCode = row['ClientID'];
        if (!clientCode) continue;

        // CLIENT
        let clientId = clientsCache.get(clientCode);
        if (!clientId) {
            const res = await query('INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType") VALUES ($1, $2, $3) RETURNING "ClientID"', [clientCode, clientCode, 'Standard']);
            clientId = res.rows[0].ClientID;
            clientsCache.set(clientCode, clientId!);
        }

        // BATCH
        const batchCode = row['Batch'] || 'Default';
        const dateStr = row['Date Created'] ? new Date(row['Date Created']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const batchKey = `${clientId}-${batchCode}-${dateStr}`;

        let batchId = batchesCache.get(batchKey);
        if (!batchId) {
            const existingBatch = await query('SELECT "BatchID" FROM "Batches" WHERE "ClientID" = $1 AND "BatchCode" = $2 AND "Date" = $3', [clientId, batchCode, dateStr]);
            if (existingBatch.rows.length > 0) {
                batchId = existingBatch.rows[0].BatchID;
            } else {
                const res = await query(
                    `INSERT INTO "Batches" ("ClientID", "BatchCode", "Date", "Status", "Description", "PaymentCategory", "EntryMode") VALUES ($1, $2, $3, 'Closed', 'Imported', 'Mixed', 'Manual') RETURNING "BatchID"`,
                    [clientId, batchCode, dateStr]
                );
                batchId = res.rows[0].BatchID;
            }
            batchesCache.set(batchKey, batchId!);
        }

        // DONATION
        const amount = parseFloat((row['Gift Amount'] || '0').replace(/[$,]/g, ''));
        const pledge = parseFloat((row['Pledge Amount'] || '0').replace(/[$,]/g, ''));
        const fee = parseFloat((row['Gift Fee'] || '0').replace(/[$,]/g, ''));
        const isInactive = row['Yes Inactive'] === 'TRUE';

        await query(
            `INSERT INTO "Donations"
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber",
             "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
             "DonorAddress", "DonorCity", "DonorState", "DonorZip",
             "DonorEmail", "DonorPhone", "DonorOccupation", "DonorEmployer",
             "GiftMethod", "GiftPlatform", "GiftType",
             "GiftPledgeAmount", "GiftFee",
             "PostMarkYear", "PostMarkQuarter", "IsInactive", 
             "GiftDate", "BatchDate", "CreatedAt", "Comment")
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW(), $29)`,
            [
                clientId, batchId, amount, row['SecondaryID (CagingID or Import ID)'], null,
                row['Prefix'], row['First Name'], row['Middle Name'], row['Last Name'], row['Suffix'],
                row['Address'], row['City'], row['State'], row['Zip'],
                row['Email'], row['Phone'], row['Occupation'], row['Employer'],
                row['Gift Method'], row['Gift Platform'], row['Gift Type'],
                pledge, fee,
                parseInt(row['Postmark Year']) || null, row['Postmark Quarter'], isInactive,
                dateStr, dateStr, row['Comment']
            ]
        );
        imported++;
    }

    console.log(`\n\n✅ DONE! Imported ${imported} records.`);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
