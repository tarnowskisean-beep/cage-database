/* eslint-disable */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

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

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomAmount() {
    const rand = Math.random();
    if (rand < 0.5) return Math.floor(Math.random() * 50) + 10;
    if (rand < 0.8) return Math.floor(Math.random() * 200) + 50;
    return Math.floor(Math.random() * 5000) + 250;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
    try {
        console.log('Connected to database.');

        // 1. Clean Slate
        console.log('Cleaning tables...');
        try {
            await pool.query(`
                TRUNCATE TABLE "DepositDonationLinks", "BankDeposits", "Donations", "BatchDocuments", "Batches", "Clients", "Users" RESTART IDENTITY CASCADE;
            `);
        } catch (e) {
            console.log('Error cleaning tables:', e.message);
        }

        // 2. Seed Users
        console.log('Seeding Users...');
        const userRes = await pool.query(`
            INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
            VALUES ('agraham', 'alyssa@compass.com', 'hashedpassword', 'Admin', 'AG')
            RETURNING "UserID"
        `);
        const userId = userRes.rows[0].UserID;

        // 3. Seed Clients
        console.log('Seeding Clients...');
        const clientIds = [];
        for (const client of CLIENTS) {
            const res = await pool.query(
                `INSERT INTO "Clients" ("ClientCode", "ClientName", "ClientType") VALUES ($1, $2, $3) RETURNING "ClientID"`,
                [client.code, client.name, client.type]
            );
            clientIds.push(res.rows[0].ClientID);
        }

        // 4. Seed Batches & Donations
        console.log('Seeding Batches and Donations...');
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        const endDate = new Date();

        for (const clientId of clientIds) {
            const numBatches = Math.floor(Math.random() * 2) + 1; // Smaller batch count

            for (let i = 0; i < numBatches; i++) {
                const batchDate = randomDate(startDate, endDate);
                const batchCode = `BATCH-${Math.floor(Math.random() * 10000)}`;

                const batchRes = await pool.query(`
                    INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
                    VALUES ($1, $2, 'Manual', 'Checks', 'Closed', $3, $4)
                    RETURNING "BatchID"
                `, [batchCode, clientId, userId, batchDate.toISOString()]);

                const batchId = batchRes.rows[0].BatchID;

                const numDonations = Math.floor(Math.random() * 10) + 1;
                for (let j = 0; j < numDonations; j++) {
                    const amount = randomAmount();
                    let method = randomChoice(METHODS);
                    const platform = randomChoice(PLATFORMS);

                    if (['WinRed', 'Stripe', 'Anedot'].includes(platform)) {
                        method = 'Online';
                    }

                    await pool.query(`
                        INSERT INTO "Donations" ("ClientID", "BatchID", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType", "GiftYear", "GiftQuarter", "GiftType")
                        VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, 'Individual/Trust/IRA')
                    `, [
                        clientId,
                        batchId,
                        amount,
                        method,
                        platform,
                        batchDate.toISOString(),
                        batchDate.getFullYear(),
                        `Q${Math.ceil((batchDate.getMonth() + 1) / 3)}`
                    ]);
                }
            }
        }

        // 5. Seed Recent Data (Last 7 Days) for Dashboard Default View
        console.log('Seeding recent data for this week...');
        const recentStart = new Date();
        recentStart.setDate(recentStart.getDate() - 7);
        const recentEnd = new Date();

        for (const clientId of clientIds) {
            // Ensure every client has activity this week
            const numBatches = Math.floor(Math.random() * 2) + 1;

            for (let i = 0; i < numBatches; i++) {
                const batchDate = randomDate(recentStart, recentEnd);
                const batchCode = `BATCH-RECENT-${Math.floor(Math.random() * 1000)}`;

                const batchRes = await pool.query(`
                    INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy", "Date")
                    VALUES ($1, $2, 'Manual', 'Checks', 'Closed', $3, $4)
                    RETURNING "BatchID"
                `, [batchCode, clientId, userId, batchDate.toISOString()]);

                const batchId = batchRes.rows[0].BatchID;

                const numDonations = Math.floor(Math.random() * 15) + 5;
                for (let j = 0; j < numDonations; j++) {
                    const amount = randomAmount();
                    let method = randomChoice(METHODS);
                    const platform = randomChoice(PLATFORMS);

                    if (['WinRed', 'Stripe', 'Anedot'].includes(platform)) {
                        method = 'Online';
                    }

                    await pool.query(`
                        INSERT INTO "Donations" ("ClientID", "BatchID", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", "TransactionType", "GiftYear", "GiftQuarter", "GiftType")
                        VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, 'Individual/Trust/IRA')
                    `, [
                        clientId,
                        batchId,
                        amount,
                        method,
                        platform,
                        batchDate.toISOString(),
                        batchDate.getFullYear(),
                        `Q${Math.ceil((batchDate.getMonth() + 1) / 3)}`
                    ]);
                }
            }
        }

        console.log(`Seed complete! 
        - ${CLIENTS.length} Clients
        - Historical and RECENT data generated.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
