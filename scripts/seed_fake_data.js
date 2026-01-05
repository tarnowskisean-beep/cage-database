const { Client } = require('pg');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function seed() {
    console.log("🌱 Starting Database Seed (Bulk 100k + People/Comments)...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // ---------------------------------------------------------
        // 0. SCHEMA ASSURANCE (Ensure Tables Exist)
        // ---------------------------------------------------------
        console.log("🛠️  Verifying Schema...");

        // Import Schema
        try {
            const schemaPath = path.join(__dirname, '../database/schema_import.sql');
            if (fs.existsSync(schemaPath)) {
                await client.query(fs.readFileSync(schemaPath, 'utf8'));
            }
        } catch (e) { console.warn("Import schema warning:", e.message); }

        // People Extension & Schema
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
        // Add indices
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_email ON "Donors" ("Email");`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_donors_name ON "Donors" ("LastName", "FirstName");`);

        // Check/Add DonorID to Donations
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

        // Comments (DonorNotes) Schema
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
        // 1. TRUNCATE (But keep structure)
        // ---------------------------------------------------------
        console.log("🧹 Cleaning up old data...");
        // Truncate tables including new ones
        await client.query(`
            TRUNCATE "Users", "Clients", "Batches", "BatchDocuments", "Donations", 
            "BankDeposits", "DepositDonationLinks", "AuditLogs", 
            "ReconciliationPeriods", "ReconciliationBatchDetails", "ReconciliationBankTransactions", 
            "ReconciliationExceptions", "ClientBankAccounts",
            "import_sessions", "staging_revenue", "mapping_rules",
            "Donors", "DonorNotes"
            RESTART IDENTITY CASCADE;
        `);

        // Re-seed default mapping rules
        const schemaPath = path.join(__dirname, '../database/schema_import.sql');
        if (fs.existsSync(schemaPath)) {
            await client.query(fs.readFileSync(schemaPath, 'utf8'));
        }

        // ---------------------------------------------------------
        // 2. CLIENTS (Preserve Originals)
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
        // 3. USERS
        // ---------------------------------------------------------
        console.log("👤 Creating Users...");
        const passwordHash = await bcrypt.hash('password', 10);

        const usersData = [
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
        const adminId = userIds[0];
        const clerkId = userIds[1];

        // ---------------------------------------------------------
        // 4. PEOPLE (Donors) & COMMENTS
        // ---------------------------------------------------------
        console.log("👥 Creating 500 People & Comments...");
        const donorIds = [];
        const DONOR_COUNT = 500;

        // Chunk inserts for donors
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

        // Add Comments to random donors
        console.log("💬 Adding Comments to People...");
        for (let i = 0; i < 200; i++) { // 200 notes
            const donorId = faker.helpers.arrayElement(donorIds);
            await client.query(`
                INSERT INTO "DonorNotes" ("DonorID", "AuthorName", "Content", "CreatedAt")
                VALUES ($1, $2, $3, $4)
            `, [
                donorId,
                'Admin User',
                faker.lorem.sentence(),
                faker.date.recent({ days: 30 })
            ]);
        }

        // ---------------------------------------------------------
        // 5. BATCHES & DONATIONS (Bulk 100k)
        // ---------------------------------------------------------
        console.log("📦 Generating 5,000 Batches (~100k Donations linked to People)...");

        const BATCH_COUNT = 5000;
        const DONATIONS_PER_BATCH = 20;
        const entryModes = ['Barcode', 'Datamatrix', 'Manual'];
        const paymentCategories = ['Checks', 'CC', 'EFT', 'Mixed'];
        const statuses = ['Open', 'Submitted', 'Closed'];

        const getBatchDateString = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

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

            // Composite Batch Code
            const dateStr = getBatchDateString(date);
            const suffix = faker.string.alphanumeric(4).toUpperCase();
            const batchCode = `${clientCode}-${dateStr}-${suffix}`;

            const res = await client.query(
                `INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "BatchID"`,
                [
                    batchCode,
                    clientId,
                    faker.helpers.arrayElement(entryModes),
                    faker.helpers.arrayElement(paymentCategories),
                    status,
                    clerkId,
                    date
                ]
            );
            const batchId = res.rows[0].BatchID;

            for (let j = 0; j < DONATIONS_PER_BATCH; j++) {
                const amount = faker.finance.amount({ min: 10, max: 5000 });
                const platform = faker.helpers.arrayElement(['Cage', 'Stripe', 'WinRed', 'Anedot']);
                let method = 'Check';
                if (['Stripe', 'WinRed', 'Anedot'].includes(platform)) method = 'Online';

                const year = date.getFullYear();
                const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`;

                // Link to a person? 80% chance
                const personId = Math.random() > 0.2 ? faker.helpers.arrayElement(donorIds) : null;

                donationBuffer.push({
                    clientId,
                    batchId,
                    amount,
                    method,
                    platform,
                    date: date.toISOString(),
                    type: 'Donation',
                    year,
                    quarter,
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
        // 6. RECONCILIATION
        // ---------------------------------------------------------
        console.log("⚖️  Creating Reconciliation Data...");
        const demoClientId = clientIds[0];
        const periodStart = new Date();
        periodStart.setDate(1);
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);

        const recRes = await client.query(
            `INSERT INTO "ReconciliationPeriods" 
            ("ClientID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status", "StatementEndingBalance", "CreatedBy")
            VALUES ($1, $2, $3, $4, 'Open', 5000.00, $5) RETURNING "ReconciliationPeriodID"`,
            [demoClientId, periodStart, periodEnd, periodEnd, adminId]
        );
        const periodId = recRes.rows[0].ReconciliationPeriodID;

        // Mock Bank Transactions
        for (let i = 0; i < 5; i++) {
            await client.query(
                `INSERT INTO "ReconciliationBankTransactions"
                ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountIn", "Description", "Matched")
                VALUES ($1, $2, $3, 'Deposit', $4, $5, $6)`,
                [periodId, demoClientId, faker.date.recent(), faker.finance.amount({ min: 100, max: 2000 }), "Mobile Deposit", false]
            );
        }
        for (let i = 0; i < 10; i++) {
            await client.query(
                `INSERT INTO "ReconciliationBankTransactions"
                ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountOut", "Description", "Matched")
                VALUES ($1, $2, $3, 'Payment', $4, $5, $6)`,
                [periodId, demoClientId, faker.date.recent(), faker.finance.amount({ min: 10, max: 500 }), "Vendor Payment", false]
            );
        }

        // ---------------------------------------------------------
        // 7. AUDIT LOGS
        // ---------------------------------------------------------
        console.log("📜 Creating Audit Logs...");
        const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
        for (let i = 0; i < 100; i++) {
            const randomUserIndex = faker.number.int({ min: 0, max: usersData.length - 1 });
            const actorEmail = usersData[randomUserIndex].email;
            const action = faker.helpers.arrayElement(actions);
            let entityType = 'USER';
            let entityId = null;
            let details = null;

            if (['CREATE', 'UPDATE', 'VIEW'].includes(action)) {
                entityType = 'BATCH';
                details = 'Batch Operation';
            } else if (action === 'LOGIN') {
                entityType = 'AUTH';
                details = "User logged in";
            }

            await client.query(
                `INSERT INTO "AuditLogs" ("Action", "EntityType", "EntityID", "Details", "Actor", "CreatedAt", "IPAddress")
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [action, entityType, entityId, details, actorEmail, faker.date.recent({ days: 7 }), faker.internet.ip()]
            );
        }

        // ---------------------------------------------------------
        // 8. IMPORT LOGS
        // ---------------------------------------------------------
        console.log("📥 Creating Import Logs...");
        for (let i = 0; i < 5; i++) {
            const status = faker.helpers.arrayElement(['Completed', 'Failed', 'Processing']);
            const sessionRes = await client.query(
                `INSERT INTO "import_sessions" ("filename", "source_system", "status", "created_by", "row_count", "processed_count")
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [`upload_${faker.date.recent().getTime()}.csv`, 'Winred', status, adminId, 100, 100]
            );
            const sessionId = sessionRes.rows[0].id;
            if (status !== 'Failed') {
                for (let j = 0; j < 10; j++) {
                    await client.query(
                        `INSERT INTO "staging_revenue" ("session_id", "source_row_data", "validation_status")
                         VALUES ($1, $2, $3)`,
                        [sessionId, JSON.stringify({ amount: faker.finance.amount() }), 'Valid']
                    );
                }
            }
        }

        console.log("✅ Database Seeded Successfully!");
        console.log("   - Clients: 16 (Originals)");
        console.log("   - People: 500 Donors (with Comments)");
        console.log("   - Batches: 5,000");
        console.log("   - Donations: 100,000+ (Linked to People)");

    } catch (e) {
        console.error("❌ Seeding Failed:", e);
    } finally {
        await client.end();
    }
}

seed();
