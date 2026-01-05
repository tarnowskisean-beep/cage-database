
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

const PLATFORMS = ['Cage', 'Stripe', 'Propay', 'WinRed', 'Anedot'];
const METHODS = ['Check', 'Credit Card', 'Cash', 'EFT', 'Online'];

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomAmount() {
    const rand = Math.random();
    if (rand < 0.5) return Math.floor(Math.random() * 50) + 10;
    if (rand < 0.8) return Math.floor(Math.random() * 200) + 50;
    return Math.floor(Math.random() * 5000) + 250;
}

function randomChoice(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        console.log('Starting seed process...');

        if (force) {
            await query(`TRUNCATE TABLE "DepositDonationLinks", "BankDeposits", "Donations", "BatchDocuments", "Batches", "Clients", "Users" RESTART IDENTITY CASCADE;`);
        }

        // 2. Seed Users
        let userId = 1;
        const passwordHash = await bcrypt.hash('password', 10);

        // Upsert Admin
        const userRes = await query(`
            INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
            VALUES ('agraham', 'alyssa@compass.com', $1, 'Admin', 'AG')
            ON CONFLICT ("Email") DO UPDATE SET "Role" = 'Admin'
            RETURNING "UserID"
        `, [passwordHash]);

        if (userRes.rows.length > 0) userId = userRes.rows[0].UserID;
        else {
            // Fetch existing if conflict
            const existing = await query(`SELECT "UserID" FROM "Users" WHERE "Email" = 'alyssa@compass.com'`);
            userId = existing.rows[0].UserID;
        }

        // 3. Seed Clients
        const clientIds: number[] = [];
        for (const client of CLIENTS) {
            const res = await query(
                `INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType") 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT ("ClientCode") DO NOTHING
                 RETURNING "ClientID"`,
                [client.code, client.name, client.type]
            );

            if (res.rows.length > 0) {
                clientIds.push(res.rows[0].ClientID);
            } else {
                const existing = await query(`SELECT "ClientID" FROM "Clients" WHERE "ClientCode" = $1`, [client.code]);
                clientIds.push(existing.rows[0].ClientID);
            }
        }

        // 4. Seed Batches & Donations
        if (force) {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 6);
            const endDate = new Date();

            for (const clientId of clientIds) {
                const numBatches = Math.floor(Math.random() * 2) + 1;

                for (let i = 0; i < numBatches; i++) {
                    const batchDate = randomDate(startDate, endDate);
                    const batchCode = `BATCH-${Math.floor(Math.random() * 10000)}`;

                    const batchRes = await query(`
                        INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
                        VALUES ($1, $2, 'Manual', 'Check', 'Closed', $3, $4)
                        RETURNING "BatchID"
                    `, [batchCode, clientId, userId, batchDate.toISOString()]);

                    const batchId = batchRes.rows[0].BatchID;

                    const numDonations = Math.floor(Math.random() * 10) + 1;
                    for (let j = 0; j < numDonations; j++) {
                        const amount = randomAmount();
                        let method = randomChoice(METHODS);
                        const platform = randomChoice(PLATFORMS);
                        const type = 'Contribution';

                        if (['WinRed', 'Stripe', 'Anedot'].includes(platform)) {
                            method = 'Online';
                        }

                        // Insert Donation
                        await query(`
                            INSERT INTO "Donations" ("ClientID", "BatchID", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType", "GiftYear", "GiftQuarter", "GiftType")
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Individual/Trust/IRA')
                        `, [
                            clientId,
                            batchId,
                            amount,
                            method,
                            platform,
                            batchDate.toISOString(),
                            type,
                            batchDate.getFullYear(),
                            `Q${Math.ceil((batchDate.getMonth() + 1) / 3)}`
                        ]);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seeding complete. Clients: ${CLIENTS.length}. Mode: ${force ? 'Full Reset' : 'Clients Only (Safe)'}`
        });

    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
