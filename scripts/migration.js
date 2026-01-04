
const { Client } = require('pg');
const fs = require('fs');
const Papa = require('papaparse');

const CSV_PATH = '/Users/seantarnowski/Downloads/DonationT_Combined_cleaned.csv';
const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';
const BATCH_SIZE = 500; // 500 * 31 params = 15,500 params. PG limit ~65000. Safe.

async function run() {
    console.log("🚀 STARTING OPTIMIZED MIGRATION (BATCHED)...");

    if (!fs.existsSync(CSV_PATH)) {
        console.error("❌ File not found at", CSV_PATH);
        process.exit(1);
    }

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ DB Connected.");

        console.log("🗑️  Resetting Data...");
        await client.query('TRUNCATE TABLE "Donations" CASCADE');
        await client.query('TRUNCATE TABLE "BatchDocuments" CASCADE');
        await client.query('TRUNCATE TABLE "Batches" CASCADE');
        console.log("✅ Data Reset Complete.");

        // Fetch Admin
        const adminUser = await client.query('SELECT "UserID" FROM "Users" ORDER BY "UserID" ASC LIMIT 1');
        const adminUserId = adminUser.rows.length > 0 ? adminUser.rows[0].UserID : 1;

        console.log("📂 Reading CSV...");
        const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
        const parsed = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim()
        });

        const rows = parsed.data;
        console.log(`📊 Found ${rows.length} rows. Processing...`);

        const clientsCache = new Map();
        const batchesCache = new Map();

        const dbClients = await client.query('SELECT "ClientID", "ClientCode" FROM "Clients"');
        dbClients.rows.forEach(r => clientsCache.set(r.ClientCode, r.ClientID));

        let donationBuffer = [];
        let imported = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const clientCode = row['ClientID'];
            if (!clientCode) continue;

            if (i % 5000 === 0) process.stdout.write(`\rProcessing ${i}/${rows.length} (${Math.round(i / rows.length * 100)}%)...`);

            // Resolve Client
            let clientId = clientsCache.get(clientCode);
            if (!clientId) {
                const res = await client.query('INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType") VALUES ($1, $2, $3) RETURNING "ClientID"', [clientCode, clientCode, 'Standard']);
                clientId = res.rows[0].ClientID;
                clientsCache.set(clientCode, clientId);
            }

            // Resolve Batch
            const batchCode = row['Batch'] || 'Default';
            let dateStr = new Date().toISOString().split('T')[0];
            if (row['Date Created']) {
                const d = new Date(row['Date Created']);
                if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
            }
            const batchKey = `${clientId}-${batchCode}-${dateStr}`;

            let batchId = batchesCache.get(batchKey);
            if (!batchId) {
                const existingBatch = await client.query('SELECT "BatchID" FROM "Batches" WHERE "ClientID" = $1 AND "BatchCode" = $2 AND "Date" = $3', [clientId, batchCode, dateStr]);
                if (existingBatch.rows.length > 0) {
                    batchId = existingBatch.rows[0].BatchID;
                } else {
                    const res = await client.query(
                        `INSERT INTO "Batches" ("ClientID", "BatchCode", "Date", "Status", "PaymentCategory", "EntryMode", "CreatedBy") VALUES ($1, $2, $3, 'Closed', 'Mixed', 'Manual', $4) RETURNING "BatchID"`,
                        [clientId, batchCode, dateStr, adminUserId]
                    );
                    batchId = res.rows[0].BatchID;
                }
                batchesCache.set(batchKey, batchId);
            }

            // Prepare Donation Data
            const amount = parseFloat((row['Gift Amount'] || '0').replace(/[$,]/g, ''));
            const pledge = parseFloat((row['Pledge Amount'] || '0').replace(/[$,]/g, ''));
            const fee = parseFloat((row['Gift Fee'] || '0').replace(/[$,]/g, ''));
            const isInactive = row['Yes Inactive'] === 'TRUE';

            donationBuffer.push([
                clientId, batchId, amount, row['SecondaryID (CagingID or Import ID)'] || null, null,
                (row['Prefix'] || '').substring(0, 20), row['First Name'], row['Middle Name'], row['Last Name'], (row['Suffix'] || '').substring(0, 20),
                row['Address'], row['City'], row['State'], (row['Zip'] || '').substring(0, 20),
                (row['Email'] || '').substring(0, 255), (row['Phone'] || '').substring(0, 20), (row['Occupation'] || '').substring(0, 50), (row['Employer'] || '').substring(0, 50),
                row['Gift Method'], row['Gift Platform'], row['Gift Type'],
                pledge, fee,
                parseInt(row['Postmark Year']) || null, row['Postmark Quarter'], isInactive,
                dateStr, dateStr, row['Comment'], (row['MailCode'] || '').substring(0, 20), 'Donation', new Date()
            ]);

            // Flush Buffer if full
            if (donationBuffer.length >= BATCH_SIZE) {
                await flushDonations(client, donationBuffer);
                imported += donationBuffer.length;
                donationBuffer = [];
                // process.stdout.write(`\rImported ${imported}...`);
            }
        }

        // Final Flush
        if (donationBuffer.length > 0) {
            await flushDonations(client, donationBuffer);
            imported += donationBuffer.length;
        }

        console.log(`\n\n✅ DONE! Imported ${imported} records.`);

    } catch (e) {
        console.error("\n❌ CRITICAL ERROR:", e);
    } finally {
        await client.end();
        console.log("🔌 Disconnected.");
    }
}

async function flushDonations(client, buffer) {
    if (buffer.length === 0) return;

    const columns = 32; // Added CreatedAt
    const valuePlaceholders = [];
    const flatParams = [];

    for (let i = 0; i < buffer.length; i++) {
        const rowParams = buffer[i];
        const rowPlaceholders = [];
        for (let j = 0; j < columns; j++) {
            rowPlaceholders.push(`$${(i * columns) + j + 1}`);
            flatParams.push(rowParams[j]);
        }
        valuePlaceholders.push(`(${rowPlaceholders.join(',')})`);
    }

    const queryStr = `INSERT INTO "Donations"
    ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber",
     "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
     "DonorAddress", "DonorCity", "DonorState", "DonorZip",
     "DonorEmail", "DonorPhone", "DonorOccupation", "DonorEmployer",
     "GiftMethod", "GiftPlatform", "GiftType",
     "GiftPledgeAmount", "GiftFee",
     "PostMarkYear", "PostMarkQuarter", "IsInactive", 
     "GiftDate", "BatchDate", "Comment", "MailCode", "TransactionType", "CreatedAt")
    VALUES ${valuePlaceholders.join(', ')}`;

    await client.query(queryStr, flatParams);
}

run();
