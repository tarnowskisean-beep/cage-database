require('dotenv').config();
const { Client } = require('pg');
const { faker } = require('@faker-js/faker');

// Configuration
const MONTHS_HISTORY = 6;
const BATCHES_PER_WEEK_MIN = 1;
const BATCHES_PER_WEEK_MAX = 3;
const DONATIONS_PER_BATCH_MIN = 5;
const DONATIONS_PER_BATCH_MAX = 25;

async function seedHistory() {
    console.log("🌱 Starting Historical Data Seed...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ Error: DATABASE_URL is missing from .env");
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Fetch Clients
        const clientsRes = await client.query('SELECT "ClientID", "ClientCode" FROM "Clients" WHERE "Status" = \'Active\'');
        const clients = clientsRes.rows;

        if (clients.length === 0) {
            console.error("❌ No active clients found! Run /api/seed first.");
            process.exit(1);
        }
        console.log(`Found ${clients.length} active clients.`);

        // 2. Fetch a Default User (System/Admin)
        const userRes = await client.query('SELECT "UserID" FROM "Users" LIMIT 1');
        const userId = userRes.rows.length > 0 ? userRes.rows[0].UserID : null;
        if (!userId) {
            console.error("❌ No users found. Run migration or create a user first.");
            // Fallback or exit? Exit safest.
            process.exit(1);
        }

        let totalBatches = 0;
        let totalDonations = 0;

        // 3. Generate Data
        const today = new Date();
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - MONTHS_HISTORY);

        // Check Donations Table Columns to be safe
        const donColsRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Donations'
        `);
        const donCols = donColsRes.rows.map(r => r.column_name);
        const hasPaymentName = donCols.includes('PaymentName');
        const hasDonorName = donCols.includes('DonorName');
        const hasComment = donCols.includes('Comment'); // substitute for description?

        console.log(`Donations columns validated. PaymentName=${hasPaymentName}, DonorName=${hasDonorName}`);

        // Check valid Payment Categories
        const pcRes = await client.query('SELECT DISTINCT "PaymentCategory" FROM "Batches" LIMIT 50');
        const validPCs = pcRes.rows.map(r => r.PaymentCategory).filter(Boolean);
        console.log("Existing Payment Categories in DB:", validPCs);

        // Use existing ones if available, otherwise fallback to safe 'Check' guessing
        const safePaymentCategories = validPCs.length > 0 ? validPCs : ['Check', 'Credit Card'];

        // Check valid Transaction Types
        let safeTransactionType = 'Contribution';
        try {
            const ttRes = await client.query('SELECT DISTINCT "TransactionType" FROM "Donations" LIMIT 10');
            const validTTs = ttRes.rows.map(r => r.TransactionType).filter(Boolean);
            console.log("Existing Transaction Types:", validTTs);
            if (validTTs.length > 0) safeTransactionType = validTTs[0];
        } catch (e) {
            console.log("Could not fetch Transaction Types, using default:", safeTransactionType);
        }

        // Check valid Gift Platforms
        let safeGiftPlatform = 'Cage';
        try {
            const gpRes = await client.query('SELECT DISTINCT "GiftPlatform" FROM "Donations" LIMIT 10');
            const validGPs = gpRes.rows.map(r => r.GiftPlatform).filter(Boolean);
            console.log("Existing Gift Platforms:", validGPs);
            if (validGPs.length > 0) safeGiftPlatform = validGPs[0];
        } catch (e) {
            console.log("Could not fetch Gift Platforms, using default:", safeGiftPlatform);
        }

        // Iterate week by week
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            console.log(`Processing week of ${currentDate.toISOString().substring(0, 10)}...`);

            for (const c of clients) {
                // Determine number of batches for this client this week
                const numBatches = faker.number.int({ min: BATCHES_PER_WEEK_MIN, max: BATCHES_PER_WEEK_MAX });

                for (let i = 0; i < numBatches; i++) {
                    // Random date within the week
                    const batchDate = new Date(currentDate);
                    batchDate.setDate(batchDate.getDate() + faker.number.int({ min: 0, max: 6 }));
                    if (batchDate > today) continue;

                    const dateStr = batchDate.toISOString().substring(0, 10); // YYYY-MM-DD
                    const isClosed = batchDate < new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // Close if older than 7 days
                    const status = isClosed ? 'Closed' : 'Open';

                    const paymentCategory = faker.helpers.arrayElement(safePaymentCategories);
                    // Description column removed as it doesn't exist.

                    // Improved Batch Code Generation: CLIENT.PLAT.YYYY.MM.DD.SUFFIX
                    const yyyy = batchDate.getFullYear();
                    const mm = String(batchDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(batchDate.getDate()).padStart(2, '0');
                    const formattedDate = `${yyyy}.${mm}.${dd}`;
                    const suffix = faker.number.int({ min: 1, max: 99 }).toString().padStart(2, '0'); // Mock suffix
                    const batchCode = `${c.ClientCode}.SE.${formattedDate}.XX.${suffix}`; // SE=Seed

                    // Create Batch
                    const batchRes = await client.query(`
                        INSERT INTO "Batches" 
                        ("ClientID", "Date", "Status", "PaymentCategory", "EntryMode", "BatchCode", "CreatedBy")
                        VALUES ($1, $2, $3, $4, 'Manual', $5, $6)
                        RETURNING "BatchID"
                    `, [c.ClientID, dateStr, status, paymentCategory, batchCode, userId]);

                    const batchId = batchRes.rows[0].BatchID;
                    totalBatches++;

                    // Create Donations
                    const numDonations = faker.number.int({ min: DONATIONS_PER_BATCH_MIN, max: DONATIONS_PER_BATCH_MAX });
                    let batchTotal = 0;

                    for (let j = 0; j < numDonations; j++) {
                        const amount = parseFloat(faker.finance.amount({ min: 10, max: 2500, dec: 2 }));
                        const giftDate = dateStr;
                        const donorFirst = faker.person.firstName();
                        const donorLast = faker.person.lastName();
                        const fullName = `${donorFirst} ${donorLast}`;

                        // Construct dynamic query based on available columns
                        let insertCols = ['"BatchID"', '"ClientID"', '"GiftAmount"', '"GiftDate"', '"TransactionType"', '"GiftMethod"', '"GiftPlatform"'];
                        let insertVals = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
                        let insertParams = [batchId, c.ClientID, amount, giftDate, safeTransactionType, paymentCategory, safeGiftPlatform];
                        let pIdx = 8;

                        if (hasPaymentName) {
                            insertCols.push('"PaymentName"');
                            insertVals.push(`$${pIdx++}`);
                            insertParams.push(fullName);
                        } else if (hasDonorName) {
                            insertCols.push('"DonorName"');
                            insertVals.push(`$${pIdx++}`);
                            insertParams.push(fullName);
                        }

                        await client.query(`
                            INSERT INTO "Donations"
                            (${insertCols.join(', ')})
                            VALUES (${insertVals.join(', ')})
                        `, insertParams);

                        batchTotal += amount;
                        totalDonations++;
                    }

                    // Totals are calculated dynamically by the app, no need to update Batches table.
                }
            }

            // Next week
            currentDate.setDate(currentDate.getDate() + 7);
        }

        console.log("\n✅ Historical Data Seed Complete!");
        console.log(`Created ${totalBatches} batches and ${totalDonations} donations.`);

    } catch (err) {
        console.error("Critical Error:", err);
    } finally {
        await client.end();
    }
}

seedHistory();
