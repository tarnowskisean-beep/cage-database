
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
    { code: 'CPI', name: 'Conservative Partnership Institute', type: 'c3' },
    { code: 'CPIN', name: 'Conservative Partnership Initiative', type: 'c3' }
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
        const userRes = await query(`
            INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
            VALUES ('agraham', 'alyssa@compass.com', $1, 'Admin', 'AG')
            RETURNING "UserID"
        `, [passwordHash]);
        const userID = userRes.rows[0].UserID;

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

            // B. Donors
            const donorIds = [];
            const numDonors = faker.number.int({ min: 50, max: 100 });
            for (let i = 0; i < numDonors; i++) {
                const firstName = faker.person.firstName();
                const lastName = faker.person.lastName();
                const email = faker.internet.email({ firstName, lastName });

                const dRes = await query(`
                    INSERT INTO "Donors" 
                    ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip", "Bio", "CreatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                    RETURNING "DonorID"
                `, [
                    firstName,
                    lastName,
                    email,
                    faker.phone.number(),
                    faker.location.streetAddress(),
                    faker.location.city(),
                    faker.location.state({ abbreviated: true }),
                    faker.location.zipCode(),
                    faker.lorem.paragraph()
                ]);
                const donorId = dRes.rows[0].DonorID;
                donorIds.push(donorId);
            }

            // C. Periods & Batches
            const today = new Date();
            for (let i = 12; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const startOfPeriod = new Date(d.getFullYear(), d.getMonth(), 1);
                const endOfPeriod = new Date(d.getFullYear(), d.getMonth() + 1, 0);

                const transferDate = new Date(endOfPeriod);
                transferDate.setDate(transferDate.getDate() + 14);

                const isReconciled = i > 1;
                const periodStatus = isReconciled ? 'Reconciled' : 'Open';

                const pRes = await query(`
                    INSERT INTO "ReconciliationPeriods" ("ClientID", "AccountID", "PeriodStartDate", "PeriodEndDate", "ScheduledTransferDate", "Status")
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ReconciliationPeriodID"
                `, [clientId, accountId, startOfPeriod.toISOString(), endOfPeriod.toISOString(), transferDate.toISOString(), periodStatus]);

                // Batches
                const numBatches = faker.number.int({ min: 2, max: 5 });
                for (let b = 0; b < numBatches; b++) {
                    const batchDate = new Date(d.getFullYear(), d.getMonth(), faker.number.int({ min: 1, max: 28 }));
                    // Status must be Closed if reconciled, or Open/Closed otherwise.
                    // Constraint allows: Open, Submitted, Closed.
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

                    // Donations
                    const numDonations = faker.number.int({ min: 5, max: 15 });
                    for (let g = 0; g < numDonations; g++) {
                        const amount = parseFloat(faker.finance.amount({ min: 25, max: 2500, dec: 2 }));
                        const donorId = faker.helpers.arrayElement(donorIds);

                        const method = faker.helpers.arrayElement(METHODS);
                        let platform = 'Cage';
                        if (method === 'Online') {
                            platform = faker.helpers.arrayElement(['WinRed', 'Anedot', 'Stripe']);
                        } else if (method === 'Check') {
                            platform = 'Cage';
                        } else {
                            platform = faker.helpers.arrayElement(PLATFORMS);
                        }

                        // Ack logic
                        let thankedAt = null;
                        if (periodStatus === 'Reconciled' || (batchStatus === 'Closed' && faker.datatype.boolean())) {
                            thankedAt = new Date(batchDate);
                            thankedAt.setDate(thankedAt.getDate() + faker.number.int({ min: 1, max: 5 }));
                        }
                        if (amount > 100 && faker.datatype.boolean(0.2)) {
                            thankedAt = null;
                        }

                        try {
                            await query(`
                                INSERT INTO "Donations" 
                                ("ClientID", "BatchID", "DonorID", "GiftAmount", "GiftDate", "GiftMethod", "GiftPlatform", "CampaignID", "ThankYouSentAt", "GiftType", "CreatedBy")
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Individual', $10)
                            `, [
                                clientId,
                                batchId,
                                donorId,
                                amount,
                                batchDate.toISOString(),
                                method,
                                platform,
                                faker.helpers.arrayElement(CAMPAIGNS),
                                thankedAt ? thankedAt.toISOString() : null,
                                userID
                            ]);
                        } catch (err) { }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Database populated successfully!' });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
