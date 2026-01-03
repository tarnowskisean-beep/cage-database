-- Enable UUID extension if needed, though we use auto-inc INTs for this project
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients Table
CREATE TABLE IF NOT EXISTS "Clients" (
    "ClientID" SERIAL PRIMARY KEY,
    "ClientCode" TEXT NOT NULL UNIQUE,
    "ClientName" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE IF NOT EXISTS "Users" (
    "UserID" SERIAL PRIMARY KEY,
    "Username" TEXT NOT NULL UNIQUE,
    "Email" TEXT NOT NULL UNIQUE,
    "PasswordHash" TEXT NOT NULL,
    "Role" TEXT NOT NULL CHECK ("Role" IN ('Admin', 'Clerk', 'ClientUser')),
    "Initials" TEXT NOT NULL,
    "TwoFactorSecret" TEXT,
    "TwoFactorEnabled" BOOLEAN DEFAULT FALSE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Batches Table
CREATE TABLE IF NOT EXISTS "Batches" (
    "BatchID" SERIAL PRIMARY KEY,
    "BatchCode" TEXT NOT NULL,
    "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
    "EntryMode" TEXT NOT NULL CHECK ("EntryMode" IN ('Barcode', 'Datamatrix', 'Manual', 'ZerosOCR')),
    "PaymentCategory" TEXT NOT NULL CHECK ("PaymentCategory" IN ('Checks', 'EFT', 'CC', 'Cash', 'Mixed', 'Zeros')),
    "ZerosType" TEXT CHECK ("ZerosType" IN ('DemandsToBeRemoved', 'Deceased')),
    "Status" TEXT NOT NULL DEFAULT 'Open' CHECK ("Status" IN ('Open', 'Submitted', 'Closed')),
    "CreatedBy" INT NOT NULL REFERENCES "Users"("UserID"),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "SubmittedBy" INT REFERENCES "Users"("UserID"),
    "SubmittedAt" TIMESTAMPTZ,
    "Date" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BatchDocuments Table
CREATE TABLE IF NOT EXISTS "BatchDocuments" (
    "BatchDocumentID" SERIAL PRIMARY KEY,
    "BatchID" INT NOT NULL REFERENCES "Batches"("BatchID"),
    "DocumentType" TEXT NOT NULL CHECK ("DocumentType" IN ('ReplySlipsPDF', 'ChecksPDF', 'DepositSlip')),
    "FileName" TEXT NOT NULL,
    "StorageKey" TEXT NOT NULL,
    "UploadedBy" INT NOT NULL REFERENCES "Users"("UserID"),
    "UploadedAt" TIMESTAMPTZ DEFAULT NOW(),
    "FileContent" BYTEA -- Secure Storage
);

-- AuditLogs Table (SOC 2)
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "LogID" SERIAL PRIMARY KEY,
    "UserID" INT NOT NULL REFERENCES "Users"("UserID"),
    "Action" TEXT NOT NULL, -- e.g. ViewDocument, UploadDocument, CloseBatch
    "EntityID" TEXT, -- e.g. BatchID or DocumentID
    "Details" TEXT,
    "IPAddress" TEXT,
    "Timestamp" TIMESTAMPTZ DEFAULT NOW()
);

-- Donations Table
CREATE TABLE IF NOT EXISTS "Donations" (
    "DonationID" SERIAL PRIMARY KEY,
    "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
    "SecondaryID" TEXT, -- Check Number or Source ID
    "TransactionType" TEXT NOT NULL CHECK ("TransactionType" IN ('Donation', 'Refund', 'Chargeback', 'Adjustment', 'Void')),
    "GiftAmount" DECIMAL(18, 2) NOT NULL,
    "GiftFee" DECIMAL(18, 2) DEFAULT 0,
    "GiftMethod" TEXT NOT NULL,
    "GiftPlatform" TEXT NOT NULL,
    "GiftDate" TIMESTAMPTZ NOT NULL,
    "BatchID" INT REFERENCES "Batches"("BatchID"),
    "BatchDate" TIMESTAMPTZ,
    "IsVoid" BOOLEAN DEFAULT FALSE,
    "VoidReason" TEXT,
    "CreatedBy" INT REFERENCES "Users"("UserID"),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "CheckNumber" TEXT, -- Added explicitly for PG schema
    "ScanString" TEXT   -- Added explicitly for PG schema
);

-- BankDeposits Table
CREATE TABLE IF NOT EXISTS "BankDeposits" (
    "BankDepositID" SERIAL PRIMARY KEY,
    "ClientID" INT NOT NULL REFERENCES "Clients"("ClientID"),
    "PayoutSourcePlatform" TEXT NOT NULL,
    "ExternalPayoutID" TEXT NOT NULL,
    "PayoutDate" DATE NOT NULL,
    "DepositAmount" DECIMAL(18, 2) NOT NULL,
    "PayoutCompositeID" TEXT NOT NULL UNIQUE,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    "CreatedBy" INT NOT NULL REFERENCES "Users"("UserID"),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- DepositDonationLinks Table
CREATE TABLE IF NOT EXISTS "DepositDonationLinks" (
    "LinkID" SERIAL PRIMARY KEY,
    "BankDepositID" INT NOT NULL REFERENCES "BankDeposits"("BankDepositID"),
    "DonationID" INT NOT NULL REFERENCES "Donations"("DonationID"),
    "AmountApplied" DECIMAL(18, 2) NOT NULL
);

-- SEED DATA
INSERT INTO "Users" ("Username", "Email", "PasswordHash", "Role", "Initials")
VALUES ('agraham', 'alyssa@compass.com', 'hashedpassword', 'Admin', 'AG')
ON CONFLICT ("Username") DO NOTHING;

INSERT INTO "Clients" ("ClientCode", "ClientName")
VALUES ('AFL', 'American Freedom League')
ON CONFLICT ("ClientCode") DO NOTHING;

INSERT INTO "Clients" ("ClientCode", "ClientName")
VALUES ('CAND001', 'Candidate One')
ON CONFLICT ("ClientCode") DO NOTHING;
