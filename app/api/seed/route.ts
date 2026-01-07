
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

export const dynamic = 'force-dynamic';

const CLIENTS = [
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

const CAMPAIGNS = ['GENERAL', 'FALL25', 'GALA25', 'OYE25', 'MEMORIAL', 'BUILDING'];
const METHODS = ['Check', 'Credit Card', 'EFT', 'Online'];
const PLATFORMS = ['WinRed', 'Anedot', 'Stripe', 'Cage', 'Chainbridge'];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        console.log('🌱 Starting Seed Process (Status Fixed)...');

        if (!force) {
            return NextResponse.json({ message: 'Pass ?force=true to wipe and re-seed.' });
        }

        // 1. TRUNCATE
        await query(`
            TRUNCATE TABLE 
            "Donations", "Batches", "Donors", "ClientBankAccounts", "ReconciliationPeriods", 
            "Clients", "Users", "DonorTasks", "DonorFiles", "DonorNotes" 
            RESTART IDENTITY CASCADE;
        `);

        // 2. USERS
        const passwordHash = await bcrypt.hash('password', 10);

        const USERS = [
            { user: 'starnowski', email: 'sean@compass.cpa', role: 'Admin', initials: 'ST' },
            { user: 'agraham', email: 'alyssa@compass.cpa', role: 'Admin', initials: 'AG' },
            { user: 'agraham_com', email: 'alyssa@compass.com', role: 'Admin', initials: 'AG' }, // Added to ensure login works
            { user: 'admin', email: 'admin@compass.cpa', role: 'Admin', initials: 'ADM' },
            { user: 'clerk', email: 'clerk@compass.cpa', role: 'Clerk', initials: 'CLK' }
        ];

        let userID = 1;

        for (const u of USERS) {
            const userRes = await query(`
                INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
                VALUES ($1, $2, $3, $4, $5)
                RETURNING "UserID"
            `, [u.user, u.email, passwordHash, u.role, u.initials]);

            if (u.user === 'agraham') userID = userRes.rows[0].UserID;
        }

        // 3. CLIENTS
        const clientIds = [];
        for (const c of CLIENTS) {
            const res = await query(`
                INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType", "Status")
                VALUES ($1, $2, $3, 'Active') RETURNING "ClientID"
            `, [c.code, c.name, c.type]);
            clientIds.push(res.rows[0].ClientID);
        }

        // 4. DATA GENERATION PER CLIENT
        for (const clientId of clientIds) {

            // A. Bank Account
            const bankRes = await query(`
                INSERT INTO "ClientBankAccounts" ("ClientID", "AccountName", "AccountType", "BankName", "AccountNumberEncrypted")
                VALUES ($1, 'Main Operating', 'Checking', 'Chase Bank', $2) RETURNING "AccountID"
            `, [clientId, `ENC-${faker.string.numeric(8)}`]);
            const accountId = bankRes.rows[0].AccountID;

            // B. Donors (Bulk Insert with Duplicates)
            const numDonors = faker.number.int({ min: 150, max: 250 });
            const donorValues = [];
            const donorParams = [];
            let pIdx = 1;

            const createdDonors: any[] = [];

            for (let i = 0; i < numDonors; i++) {
                let firstName = faker.person.firstName();
                let lastName = faker.person.lastName();
                let email = faker.internet.email({ firstName, lastName });
                let phone = faker.phone.number();

                // 10% Chance of Duplicate (Same Name/Email)
                if (createdDonors.length > 10 && faker.datatype.boolean(0.1)) {
                    const dup = faker.helpers.arrayElement(createdDonors);
                    firstName = dup.firstName;
                    lastName = dup.lastName;
                    email = dup.email; // Exact match to trigger easy dedup
                }

                createdDonors.push({ firstName, lastName, email });

                donorValues.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`);
                donorParams.push(firstName, lastName, email, phone, faker.location.streetAddress(), faker.location.city(), faker.location.state({ abbreviated: true }), faker.location.zipCode(), faker.lorem.paragraph());
            }

            const dRes = await query(`
                INSERT INTO "Donors" 
                ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip", "Bio", "CreatedAt")
                VALUES ${donorValues.join(', ')}
                RETURNING "DonorID"
            `, donorParams);
            const donorIds = dRes.rows.map(r => r.DonorID);

            // C. Periods & Batches
            const today = new Date();
            for (let i = 12; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const startOfPeriod = new Date(d.getFullYear(), d.getMonth(), 1);
                const endOfPeriod = new Date(d.getFullYear(), d.getMonth() + 1, 0);

                const transferDate = new Date(endOfPeriod);
                transferDate.setDate(transferDate.getDate() + 14);

                const isReconciled = i > 1; // Last 2 months open
                const periodStatus = isReconciled ? 'Reconciled' : 'Open';

                const pRes = await query(`
                    INSERT INTO "ReconciliationPeriods" ("ClientID", "AccountID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status")
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ReconciliationPeriodID"
                `, [clientId, accountId, startOfPeriod.toISOString(), endOfPeriod.toISOString(), transferDate.toISOString(), periodStatus]);

                // Batches (Increased Volume)
                const numBatches = faker.number.int({ min: 5, max: 12 });
                for (let b = 0; b < numBatches; b++) {
                    const batchDate = new Date(d.getFullYear(), d.getMonth(), faker.number.int({ min: 1, max: 28 }));
                    const batchStatus = isReconciled ? 'Closed' : (faker.datatype.boolean() ? 'Closed' : 'Open');

                    const batchRes = await query(`
                        INSERT INTO "Batches" ("ClientID", "BatchCode", "Date", "Status", "EntryMode", "PaymentCategory", "CreatedBy")
                        VALUES ($1, $2, $3, $4, 'Manual', 'Credit Card', $5) RETURNING "BatchID"
                    `, [
                        clientId,
                        `BATCH-${faker.string.numeric(4)}`,
                        batchDate.toISOString(),
                        batchStatus,
                        userID
                    ]);
                    const batchId = batchRes.rows[0].BatchID;

                    // Donations (High Volume)
                    const numDonations = faker.number.int({ min: 20, max: 60 });
                    const donationValues = [];
                    const donationParams = [];
                    let dIdx = 1;

                    for (let g = 0; g < numDonations; g++) {
                        const amount = parseFloat(faker.finance.amount({ min: 25, max: 5000, dec: 2 }));
                        const donorId = faker.helpers.arrayElement(donorIds);

                        // Look up donor details if needed for denormalization, but skipping for speed as DonorID should suffice

                        const method = faker.helpers.arrayElement(METHODS);
                        let platform = method === 'Online' ? faker.helpers.arrayElement(['WinRed', 'Anedot', 'Stripe']) : (method === 'Check' ? 'Cage' : faker.helpers.arrayElement(PLATFORMS));

                        let thankedAt = null;
                        const daysSince = (today.getTime() - batchDate.getTime()) / (1000 * 3600 * 24);

                        if (batchStatus === 'Closed') {
                            if (Math.random() > 0.1) {
                                thankedAt = new Date(batchDate);
                                thankedAt.setDate(thankedAt.getDate() + faker.number.int({ min: 1, max: 5 }));
                            }
                        }

                        // Force "Outstanding" for recent high value
                        if (daysSince < 45 && amount > 500 && Math.random() > 0.3) {
                            thankedAt = null;
                        }

                        const year = batchDate.getFullYear();
                        const q = Math.ceil((batchDate.getMonth() + 1) / 3);
                        const quarter = `Q${q}`;
                        const mailCode = faker.helpers.arrayElement(CAMPAIGNS);
                        const designation = 'General Fund';

                        donationValues.push(`($${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, $${dIdx++}, 'Donation', $${dIdx++}, $${dIdx++}, $${dIdx++}, 'Individual', $${dIdx++})`);
                        donationParams.push(clientId, batchId, donorId, amount, batchDate.toISOString(), method, platform, mailCode, designation, year, quarter, thankedAt ? thankedAt.toISOString() : null, userID);
                    }

                    if (donationValues.length > 0) {
                        // Cols: ClientID, BatchID, DonorID, GiftAmount, GiftDate, GiftMethod, GiftPlatform, MailCode, Designation, TransactionType, GiftYear, GiftQuarter, ThankYouSentAt, GiftType, CreatedBy
                        await query(`
                            INSERT INTO "Donations" 
                            ("ClientID", "BatchID", "DonorID", "GiftAmount", "GiftDate", "GiftMethod", "GiftPlatform", "MailCode", "Designation", "TransactionType", "GiftYear", "GiftQuarter", "ThankYouSentAt", "GiftType", "CreatedBy")
                            VALUES ${donationValues.join(', ')}
                        `, donationParams);
                    }
                }
            }

            // D. Import Logs (Mock)
            for (let i = 0; i < 5; i++) {
                const sName = `upload_${faker.date.recent().toISOString().slice(0, 10)}.csv`;
                try {
                    const sessRes = await query(`INSERT INTO "import_sessions" ("filename", "source_system", "status", "created_by", "row_count", "processed_count") VALUES ($1, $2, 'Completed', $3, 500, 500) RETURNING id`, [sName, 'WinRed', userID]);
                    // Add some dummy rows? Maybe not needed for high level demo, just the log entry.
                } catch (e) { }
            }
        }

        // E. Audit Logs (System Wide)
        const ACTIONS = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT'];
        const valuesAudit = [];
        const paramsAudit = [];
        let aIdx = 1;

        for (let i = 0; i < 200; i++) {
            const action = faker.helpers.arrayElement(ACTIONS);
            const ip = faker.internet.ip();
            const date = faker.date.recent({ days: 30 });
            const actor = 'alyssa@compass.com';
            valuesAudit.push(`($${aIdx++}, 'USER', 'Action performed on entity', $${aIdx++}, $${aIdx++}, $${aIdx++})`);
            paramsAudit.push(action, actor, date.toISOString(), ip);
        }

        await query(`
             INSERT INTO "AuditLogs" ("Action", "EntityType", "Details", "Actor", "CreatedAt", "IPAddress")
             VALUES ${valuesAudit.join(', ')}
        `, paramsAudit);



        return NextResponse.json({ success: true, message: 'Database populated successfully!' });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
