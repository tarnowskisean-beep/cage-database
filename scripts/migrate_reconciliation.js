
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🛠️  Applying Reconciliation Schema...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. ReconciliationPeriods
        await client.query(`
            CREATE TABLE IF NOT EXISTS "ReconciliationPeriods" (
                "ReconciliationPeriodID" SERIAL PRIMARY KEY,
                "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
                "PeriodStartDate" DATE NOT NULL,
                "PeriodEndDate" DATE NOT NULL,
                "ScheduledTransferDate" DATE NOT NULL,
                "Status" TEXT NOT NULL CHECK ("Status" IN ('Open', 'Pending Reconciliation', 'Reconciled', 'Scheduled', 'Transferred', 'Exception')) DEFAULT 'Open',
                "TotalPeriodAmount" DECIMAL(18, 2) DEFAULT 0,
                "StatementEndingBalance" DECIMAL(18, 2) DEFAULT 0,
                "StatementLink" TEXT,
                "Notes" TEXT,
                "BankBalanceVerified" BOOLEAN DEFAULT FALSE,
                "BankStatementDate" DATE,
                "ActualTransferDate" DATE,
                "CreatedBy" INT REFERENCES "Users"("UserID"),
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
                "UpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
                
                CONSTRAINT "Unq_Client_Period" UNIQUE ("ClientID", "PeriodStartDate", "PeriodEndDate")
            );
        `);
        console.log("✅ Table Created: ReconciliationPeriods");

        // 2. ReconciliationBatchDetails
        await client.query(`
            CREATE TABLE IF NOT EXISTS "ReconciliationBatchDetails" (
                "DetailID" SERIAL PRIMARY KEY,
                "ReconciliationPeriodID" INT NOT NULL UNIQUE REFERENCES "ReconciliationPeriods"("ReconciliationPeriodID") ON DELETE CASCADE,
                
                "NumChecks" INT DEFAULT 0,
                "NumCash" INT DEFAULT 0,
                "NumCCStripe" INT DEFAULT 0,
                "NumEFT" INT DEFAULT 0,
                "NumStock" INT DEFAULT 0,
                "NumWinRed" INT DEFAULT 0,
                "NumUnknown" INT DEFAULT 0,
                
                "AmountChecks" DECIMAL(18, 2) DEFAULT 0,
                "AmountCash" DECIMAL(18, 2) DEFAULT 0,
                "AmountCCStripe" DECIMAL(18, 2) DEFAULT 0,
                "AmountEFT" DECIMAL(18, 2) DEFAULT 0,
                "AmountStock" DECIMAL(18, 2) DEFAULT 0,
                "AmountWinRed" DECIMAL(18, 2) DEFAULT 0,
                
                "AmountBankFees" DECIMAL(18, 2) DEFAULT 0,
                "AmountStripeFees" DECIMAL(18, 2) DEFAULT 0,
                "AmountWinRedFees" DECIMAL(18, 2) DEFAULT 0,
                
                "NumCheckChargebacks" INT DEFAULT 0,
                "AmountCheckChargebacks" DECIMAL(18, 2) DEFAULT 0,
                "NumCCStripeChargebacks" INT DEFAULT 0,
                "AmountCCStripeChargebacks" DECIMAL(18, 2) DEFAULT 0,
                "NumWinRedChargebacks" INT DEFAULT 0,
                "AmountWinRedChargebacks" DECIMAL(18, 2) DEFAULT 0,
                
                "NumDonorIncoming" INT DEFAULT 0, 
                "AmountDonorIncoming" DECIMAL(18, 2) DEFAULT 0,
                "NumDonorOutgoing" INT DEFAULT 0,
                "AmountDonorOutgoing" DECIMAL(18, 2) DEFAULT 0,
                "AmountDonorNet" DECIMAL(18, 2) DEFAULT 0
            );
        `);
        console.log("✅ Table Created: ReconciliationBatchDetails");

        // 3. ReconciliationBankTransactions
        await client.query(`
            CREATE TABLE IF NOT EXISTS "ReconciliationBankTransactions" (
                "TransactionID" SERIAL PRIMARY KEY,
                "ReconciliationPeriodID" INT REFERENCES "ReconciliationPeriods"("ReconciliationPeriodID"),
                "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
                "TransactionDate" DATE NOT NULL,
                "TransactionType" TEXT NOT NULL,
                "AmountIn" DECIMAL(18, 2) DEFAULT 0,
                "AmountOut" DECIMAL(18, 2) DEFAULT 0,
                "RunningBalance" DECIMAL(18, 2),
                "Description" TEXT,
                "ReferenceNumber" TEXT,
                "Matched" BOOLEAN DEFAULT FALSE,
                "StatementImported" BOOLEAN DEFAULT FALSE,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("✅ Table Created: ReconciliationBankTransactions");

        // 4. ReconciliationExceptions
        await client.query(`
            CREATE TABLE IF NOT EXISTS "ReconciliationExceptions" (
                "ExceptionID" SERIAL PRIMARY KEY,
                "ReconciliationPeriodID" INT NOT NULL REFERENCES "ReconciliationPeriods"("ReconciliationPeriodID"),
                "ExceptionType" TEXT NOT NULL,
                "ExpectedAmount" DECIMAL(18, 2),
                "ActualAmount" DECIMAL(18, 2),
                "VarianceAmount" DECIMAL(18, 2),
                "Description" TEXT NOT NULL,
                "ResolutionNotes" TEXT,
                "Status" TEXT DEFAULT 'Open',
                "RaisedBy" INT REFERENCES "Users"("UserID"),
                "ResolvedBy" INT REFERENCES "Users"("UserID"),
                "RaisedAt" TIMESTAMPTZ DEFAULT NOW(),
                "ResolvedAt" TIMESTAMPTZ
            );
        `);
        console.log("✅ Table Created: ReconciliationExceptions");

        // 5. ClientBankAccounts
        await client.query(`
            CREATE TABLE IF NOT EXISTS "ClientBankAccounts" (
                "AccountID" SERIAL PRIMARY KEY,
                "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
                "AccountType" TEXT NOT NULL,
                "BankName" TEXT,
                "AccountNumberEncrypted" TEXT,
                "RoutingNumberEncrypted" TEXT,
                "CurrentBalance" DECIMAL(18, 2) DEFAULT 0,
                "IsActive" BOOLEAN DEFAULT TRUE,
                "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log("✅ Table Created: ClientBankAccounts");

        // 6. Alter Table for Redesign (Idempotent)
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReconciliationPeriods' AND column_name='StatementEndingBalance') THEN
                    ALTER TABLE "ReconciliationPeriods" ADD COLUMN "StatementEndingBalance" DECIMAL(18, 2) DEFAULT 0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ReconciliationPeriods' AND column_name='StatementLink') THEN
                    ALTER TABLE "ReconciliationPeriods" ADD COLUMN "StatementLink" TEXT;
                END IF;
            END
            $$;
        `);
        console.log("✅ Schema Updated: Added Redesign Columns");

        console.log("✨ RECONCILIATION SCHEMA APPLIED SUCCESSFULLY.");

    } catch (e) {
        console.error("❌ Error applying schema:", e);
    } finally {
        await client.end();
    }
}

run();
