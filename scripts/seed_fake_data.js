const { Client } = require('pg');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function seed() {
    console.log("🌱 Starting Database Seed (Final Fix - Users Restored)...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // ---------------------------------------------------------
        // 0. SCHEMA ASSURANCE
        // ---------------------------------------------------------
        console.log("🛠️  Verifying Schema...");
        try {
            const schemaPath = path.join(__dirname, '../database/schema_import.sql');
            if (fs.existsSync(schemaPath)) await client.query(fs.readFileSync(schemaPath, 'utf8'));
        } catch (e) { console.warn("Import schema warning:", e.message); }

        await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Donors" (
                "DonorID" SERIAL PRIMARY KEY,
                "FirstName" TEXT,
                "LastName" TEXT,
                "Email" TEXT,
                "Phone" TEXT,
                "Address" TEXT,
                "City" TEXT,
                "State" TEXT,
                "Zip" TEXT,
                "CreatedAt" TIMESTAMP DEFAULT NOW(),
                "UpdatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        // Indices
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_email ON "Donors" ("Email");`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_name ON "Donors" ("LastName", "FirstName");`);

        // Check/Add DonorID
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Donations' AND column_name='DonorID') THEN
                    ALTER TABLE "Donations" ADD COLUMN "DonorID" INTEGER REFERENCES "Donors"("DonorID");
                    CREATE INDEX idx_donations_donorid ON "Donations" ("DonorID");
                END IF;
            END
            $$;
        `);

        // Comments
        await client.query(`
            CREATE TABLE IF NOT EXISTS "DonorNotes" (
                "NoteID" SERIAL PRIMARY KEY,
                "DonorID" INT NOT NULL REFERENCES "Donors"("DonorID") ON DELETE CASCADE,
                "AuthorName" TEXT, 
                "Content" TEXT NOT NULL,
                "CreatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_donornotes_donorid" ON "DonorNotes"("DonorID");`);


        // ---------------------------------------------------------
        // 1. TRUNCATE
        // ---------------------------------------------------------
        console.log("🧹 Cleaning up old data...");
        await client.query(`
            TRUNCATE "Users", "Clients", "Batches", "BatchDocuments", "Donations", 
            "BankDeposits", "DepositDonationLinks", "AuditLogs", 
            "ReconciliationPeriods", "ReconciliationBatchDetails", "ReconciliationBankTransactions", 
            "ReconciliationExceptions", "ClientBankAccounts",
            "import_sessions", "staging_revenue", "mapping_rules",
            "Donors", "DonorNotes"
            RESTART IDENTITY CASCADE;
        `);

        try {
            const schemaPath = path.join(__dirname, '../database/schema_import.sql');
            if (fs.existsSync(schemaPath)) await client.query(fs.readFileSync(schemaPath, 'utf8'));
        } catch (e) { }

        // ---------------------------------------------------------
        // 2. CLIENTS
        // ---------------------------------------------------------
        console.log("🏢 Creating 16 Original Clients...");
        const clientsData = [
            { code: 'AAF', name: 'American Accountability Foundation', type: 'c3' },
            { code: 'AFL', name: 'America First Legal', type: 'c3' },
            { code: 'AMSI', name: 'American Main Street Initiative', type: 'c3' },
            { code: 'CFRA', name: 'Citizens for Renewing America', type: 'c4' },
            { code: 'CFS', name: 'Citizens for Sanity, Inc.', type: '527' },
            { code: 'CPI', name: 'Conservative Partnership Institute', type: 'c3' },
            { code: 'CPIN', name: 'Conservative Partnership Initiative', type: 'c3' },
            { code: 'CRA', name: 'Center for Renewing America', type: 'c3' },
            { code: 'EIN', name: 'Election Integrity Network', type: 'c4' },
            { code: 'IAP', name: 'Immigration Accountability Project', type: 'c3' },
            { code: 'JLF', name: 'Johnson Leadership Fund', type: 'PAC' },
            { code: 'MFI', name: 'Maryland Family Institute', type: 'c3' },
            { code: 'PPO', name: 'Personal Policy Organization', type: 'c3' },
            { code: 'SFCA', name: 'State Freedom Caucus Action', type: '527' },
            { code: 'SFCF', name: 'State Freedom Caucus Foundation', type: 'c3' },
            { code: 'SFCN', name: 'State Freedom Caucus Network', type: 'c4' }
        ];

        const clientIdToCode = {};
        const clientIds = [];

        for (const c of clientsData) {
            const res = await client.query(
                `INSERT INTO "Clients" ("ClientCode", "ClientName") VALUES ($1, $2) RETURNING "ClientID"`,
                [c.code, c.name]
            );
            const newId = res.rows[0].ClientID;
            clientIds.push(newId);
            clientIdToCode[newId] = c.code;
        }

        // ---------------------------------------------------------
        // 3. USERS (RESTORED)
        // ---------------------------------------------------------
        console.log("👤 Creating Users (starnowski, agraham, etc)...");
        const passwordHash = await bcrypt.hash('password', 10);

        const usersData = [
            { user: 'starnowski', email: 'sean@compass.cpa', role: 'Admin', initials: 'ST' },
            { user: 'agraham', email: 'alyssa@compass.cpa', role: 'Admin', initials: 'AG' },
            { user: 'admin', email: 'admin@compass.cpa', role: 'Admin', initials: 'ADM' },
            { user: 'clerk', email: 'clerk@compass.cpa', role: 'Clerk', initials: 'CLK' },
            { user: 'viewer', email: 'viewer@compass.cpa', role: 'ClientUser', initials: 'VWR', clientId: clientIds[0] }
        ];

        const userIds = [];
        for (const u of usersData) {
            const res = await client.query(
                `INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials") 
                 VALUES ($1, $2, $3, $4, $5) RETURNING "UserID"`,
                [u.user, u.email, passwordHash, u.role, u.initials]
            );
            userIds.push(res.rows[0].UserID);
        }
        const adminId = userIds[2]; // 'admin' general user for system logs
        const clerkId = userIds[3]; // 'clerk' for batches

        // ---------------------------------------------------------
        // 4. PEOPLE & COMMENTS
        // ---------------------------------------------------------
        console.log("👥 Creating 500 People & Comments...");
        const donorIds = [];
        const DONOR_COUNT = 500;

        async function insertDonorsChunk(donors) {
            if (donors.length === 0) return;
            const values = [];
            const params = [];
            let pIndex = 1;
            for (const d of donors) {
                values.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
                params.push(d.firstName, d.lastName, d.email, d.phone, d.address, d.city, d.state, d.zip);
            }
            const res = await client.query(`
                INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip")
                VALUES ${values.join(', ')}
                RETURNING "DonorID"
            `, params);
            res.rows.forEach(r => donorIds.push(r.DonorID));
        }

        let donorBuffer = [];
        for (let i = 0; i < DONOR_COUNT; i++) {
            donorBuffer.push({
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state({ abbreviated: true }),
                zip: faker.location.zipCode()
            });
            if (donorBuffer.length >= 100) {
                await insertDonorsChunk(donorBuffer);
                donorBuffer = [];
            }
        }
        await insertDonorsChunk(donorBuffer);

        console.log("💬 Adding Comments...");
        for (let i = 0; i < 200; i++) {
            const donorId = faker.helpers.arrayElement(donorIds);
            await client.query(`
                INSERT INTO "DonorNotes" ("DonorID", "AuthorName", "Content", "CreatedAt")
                VALUES ($1, $2, $3, $4)
            `, [donorId, 'Sean Tarnowski', faker.lorem.sentence(), faker.date.recent({ days: 30 })]);
        }

        // ---------------------------------------------------------
        // 5. BATCHES & DONATIONS (100k)
        // ---------------------------------------------------------
        console.log("📦 Generating 5,000 Batches (~100k Donations linked to People)...");

        const BATCH_COUNT = 5000;
        const DONATIONS_PER_BATCH = 20;
        const entryModes = ['Barcode', 'Datamatrix', 'Manual'];
        const paymentCategories = ['Checks', 'CC', 'EFT', 'Mixed'];
        const statuses = ['Open', 'Submitted', 'Closed'];
        const platformCodes = { 'Cage': 'CG', 'Stripe': 'ST', 'WinRed': 'WR', 'Anedot': 'AN' };

        async function insertDonationsChunk(donations) {
            if (donations.length === 0) return;
            const values = [];
            const params = [];
            let pIndex = 1;

            for (const d of donations) {
                values.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
                params.push(d.clientId, d.batchId, d.amount, d.method, d.platform, d.date, d.type, d.year, d.quarter, d.giftType, d.donorId);
            }

            const queryText = `INSERT INTO "Donations" 
                ("ClientID", "BatchID", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType", "GiftYear", "GiftQuarter", "GiftType", "DonorID")
                VALUES ${values.join(', ')}`;

            await client.query(queryText, params);
        }

        let donationBuffer = [];
        const BATCH_CHUNK_SIZE = 500;

        for (let i = 0; i < BATCH_COUNT; i++) {
            const clientId = faker.helpers.arrayElement(clientIds);
            const clientCode = clientIdToCode[clientId];
            const status = faker.helpers.arrayElement(statuses);
            const date = faker.date.past({ years: 0.5 });
            const entryMode = faker.helpers.arrayElement(entryModes);
            const payCat = faker.helpers.arrayElement(paymentCategories);

            // Platform Decision
            const platform = faker.helpers.arrayElement(['Cage', 'Stripe', 'WinRed', 'Anedot']);
            const pCode = platformCodes[platform] || 'OT';

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const initials = 'ST'; // Use User ID logic if real, simulating ST here
            const seq = String(faker.number.int({ min: 1, max: 99 })).padStart(2, '0');

            // NEW FORMAT: AFL.CG.2025.12.25.ST.01
            const batchCode = `${clientCode}.${pCode}.${yyyy}.${mm}.${dd}.${initials}.${seq}`;

            const res = await client.query(
                `INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "BatchID"`,
                [
                    batchCode,
                    clientId,
                    entryMode,
                    payCat,
                    status,
                    clerkId,
                    date
                ]
            );
            const batchId = res.rows[0].BatchID;

            for (let j = 0; j < DONATIONS_PER_BATCH; j++) {
                const amount = faker.finance.amount({ min: 10, max: 5000 });
                const personId = Math.random() > 0.2 ? faker.helpers.arrayElement(donorIds) : null;

                let method = 'Check';
                if (['Stripe', 'WinRed', 'Anedot'].includes(platform)) method = 'Online';
                else method = 'Check';

                donationBuffer.push({
                    clientId,
                    batchId,
                    amount,
                    method,
                    platform,
                    date: date.toISOString(),
                    type: 'Donation',
                    year: yyyy,
                    quarter: `Q${Math.ceil((date.getMonth() + 1) / 3)}`,
                    giftType: 'Individual',
                    donorId: personId
                });

                if (donationBuffer.length >= BATCH_CHUNK_SIZE) {
                    await insertDonationsChunk(donationBuffer);
                    donationBuffer = [];
                }
            }
            if (i % 500 === 0 && i > 0) process.stdout.write('.');
        }
        await insertDonationsChunk(donationBuffer);
        console.log("\n✅ 100,000+ Donations Seeded!");

        // ---------------------------------------------------------
        // 6. RECONCILIATION & AUDIT & IMPORT
        // ---------------------------------------------------------
        console.log("⚖️  Creating Reconciliation Data...");
        const demoClientId = clientIds[0];
        const periodStart = new Date(); periodStart.setDate(1);
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
        const recRes = await client.query(
            `INSERT INTO "ReconciliationPeriods" 
            ("ClientID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status", "StatementEndingBalance", "CreatedBy")
            VALUES ($1, $2, $3, $4, 'Open', 5000.00, $5) RETURNING "ReconciliationPeriodID"`,
            [demoClientId, periodStart, periodEnd, periodEnd, adminId]
        );
        const periodId = recRes.rows[0].ReconciliationPeriodID;
        // Mock Transactions...
        for (let i = 0; i < 5; i++) {
            await client.query(`INSERT INTO "ReconciliationBankTransactions" ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountIn", "Description", "Matched") VALUES ($1, $2, $3, 'Deposit', $4, $5, $6)`, [periodId, demoClientId, faker.date.recent(), faker.finance.amount({ min: 100, max: 2000 }), "Mobile Deposit", false]);
        }
        for (let i = 0; i < 10; i++) {
            await client.query(`INSERT INTO "ReconciliationBankTransactions" ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountOut", "Description", "Matched") VALUES ($1, $2, $3, 'Payment', $4, $5, $6)`, [periodId, demoClientId, faker.date.recent(), faker.finance.amount({ min: 10, max: 500 }), "Vendor Payment", false]);
        }

        console.log("📜 Audits & Imports...");
        // Audit Logs
        const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
        for (let i = 0; i < 100; i++) {
            const randomUser = faker.helpers.arrayElement(usersData);
            await client.query(`INSERT INTO "AuditLogs" ("Action", "EntityType", "Details", "Actor", "CreatedAt", "IPAddress") VALUES ($1, $2, $3, $4, $5, $6)`,
                [faker.helpers.arrayElement(actions), 'USER', 'Details', randomUser.email, faker.date.recent(), faker.internet.ip()]);
        }
        // Import Logs
        for (let i = 0; i < 5; i++) {
            const sessionRes = await client.query(`INSERT INTO "import_sessions" ("filename", "source_system", "status", "created_by", "row_count", "processed_count") VALUES ($1, $2, $3, $4, 100, 100) RETURNING id`, [`upload.csv`, 'Winred', 'Completed', adminId]);
            const sid = sessionRes.rows[0].id;
            for (let j = 0; j < 10; j++) await client.query(`INSERT INTO "staging_revenue" ("session_id", "source_row_data", "validation_status") VALUES ($1, $2, 'Valid')`, [sid, JSON.stringify({ amt: 100 })]);
        }

        console.log("✅ Database Seeded Successfully!");

    } catch (e) {
        console.error("❌ Seeding Failed:", e);
    } finally {
        await client.end();
    }
}

seed();
