
import { Client } from 'pg';

const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🛠️  Migrating Multi-Account Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Update ClientBankAccounts
        console.log("1️⃣  Updating ClientBankAccounts...");
        await client.query(`
            ALTER TABLE "ClientBankAccounts" 
            ADD COLUMN IF NOT EXISTS "AccountName" TEXT;
        `);

        // 2. Add AccountID to Tables
        console.log("2️⃣  Adding AccountID columns...");

        const tables = ['Batches', 'Donations', 'ReconciliationPeriods'];
        for (const table of tables) {
            await client.query(`
                ALTER TABLE "${table}" 
                ADD COLUMN IF NOT EXISTS "AccountID" INT REFERENCES "ClientBankAccounts"("AccountID");
            `);
        }

        // 3. Seed Default Accounts & Backfill
        console.log("3️⃣  Seeding Default Accounts & Backfilling...");

        // Get all clients
        const res = await client.query(`SELECT "ClientID", "ClientName" FROM "Clients"`);
        const clients = res.rows;

        for (const c of clients) {
            // Check if account exists
            let accountRes = await client.query(
                `SELECT "AccountID" FROM "ClientBankAccounts" WHERE "ClientID" = $1 ORDER BY "AccountID" ASC LIMIT 1`,
                [c.ClientID]
            );

            let accountId;
            if (accountRes.rows.length === 0) {
                // Create Default Account
                console.log(`   Creating default account for ${c.ClientName}...`);
                const insertRes = await client.query(`
                    INSERT INTO "ClientBankAccounts" ("ClientID", "AccountType", "BankName", "AccountName", "IsActive")
                    VALUES ($1, 'Checking', 'Default Bank', 'Main Operating', TRUE)
                    RETURNING "AccountID"
                `, [c.ClientID]);
                accountId = insertRes.rows[0].AccountID;
            } else {
                accountId = accountRes.rows[0].AccountID;
                // Ensure it has a name
                await client.query(`UPDATE "ClientBankAccounts" SET "AccountName" = 'Main Operating' WHERE "AccountID" = $1 AND "AccountName" IS NULL`, [accountId]);
            }

            // Backfill Tables for this Client
            // Only update rows that represent THIS client and have NULL AccountID
            console.log(`   Backfilling data for ${c.ClientName} (AccountID: ${accountId})...`);

            await client.query(`UPDATE "Batches" SET "AccountID" = $1 WHERE "ClientID" = $2 AND "AccountID" IS NULL`, [accountId, c.ClientID]);
            await client.query(`UPDATE "Donations" SET "AccountID" = $1 WHERE "ClientID" = $2 AND "AccountID" IS NULL`, [accountId, c.ClientID]);
            await client.query(`UPDATE "ReconciliationPeriods" SET "AccountID" = $1 WHERE "ClientID" = $2 AND "AccountID" IS NULL`, [accountId, c.ClientID]);
        }

        console.log("✅ Migration Complete!");

    } catch (e) {
        console.error("❌ Error migrating schema:", e);
    } finally {
        await client.end();
    }
}

run();
