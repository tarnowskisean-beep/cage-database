-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CompassCaging')
BEGIN
    CREATE DATABASE CompassCaging;
END
GO

USE CompassCaging;
GO

-- Clients Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Clients]') AND type in (N'U'))
BEGIN
CREATE TABLE Clients (
    ClientID INT IDENTITY(1,1) PRIMARY KEY,
    ClientCode NVARCHAR(50) NOT NULL UNIQUE, -- e.g. AFL, CAND001
    ClientName NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

-- Users Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'Clerk', 'ClientUser')),
    Initials NVARCHAR(5) NOT NULL, -- Used for BatchID
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

-- Batches Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Batches]') AND type in (N'U'))
BEGIN
CREATE TABLE Batches (
    BatchID INT IDENTITY(1,1) PRIMARY KEY,
    BatchCode NVARCHAR(50) NOT NULL, -- e.g. AG.03
    ClientID INT NOT NULL FOREIGN KEY REFERENCES Clients(ClientID),
    EntryMode NVARCHAR(50) NOT NULL CHECK (EntryMode IN ('Barcode', 'Datamatrix', 'Manual', 'ZerosOCR')),
    PaymentCategory NVARCHAR(50) NOT NULL CHECK (PaymentCategory IN ('Checks', 'EFT', 'CC', 'Cash', 'Mixed', 'Zeros')),
    ZerosType NVARCHAR(50) NULL CHECK (ZerosType IN ('DemandsToBeRemoved', 'Deceased')),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (Status IN ('Open', 'Submitted', 'Closed')),
    CreatedBy INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    SubmittedBy INT NULL FOREIGN KEY REFERENCES Users(UserID),
    SubmittedAt DATETIME2 NULL,
    Date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
END
GO

-- BatchDocuments Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BatchDocuments]') AND type in (N'U'))
BEGIN
CREATE TABLE BatchDocuments (
    BatchDocumentID INT IDENTITY(1,1) PRIMARY KEY,
    BatchID INT NOT NULL FOREIGN KEY REFERENCES Batches(BatchID),
    DocumentType NVARCHAR(50) NOT NULL CHECK (DocumentType IN ('ReplySlipsPDF', 'ChecksPDF', 'DepositSlip')),
    FileName NVARCHAR(255) NOT NULL,
    StorageKey NVARCHAR(500) NOT NULL,
    UploadedBy INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    UploadedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    FileContent VARBINARY(MAX) -- Secure Storage
);
END
GO

-- AuditLogs Table (SOC 2)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
BEGIN
CREATE TABLE AuditLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Action NVARCHAR(50) NOT NULL,
    EntityID NVARCHAR(50),
    Details NVARCHAR(MAX),
    IPAddress NVARCHAR(50),
    Timestamp DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

-- Donations Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Donations]') AND type in (N'U'))
BEGIN
CREATE TABLE Donations (
    DonationID INT IDENTITY(1,1) PRIMARY KEY,
    ClientID INT NOT NULL FOREIGN KEY REFERENCES Clients(ClientID),
    SecondaryID NVARCHAR(100) NULL, -- Source ID
    TransactionType NVARCHAR(50) NOT NULL CHECK (TransactionType IN ('Donation', 'Refund', 'Chargeback', 'Adjustment', 'Void')),
    GiftAmount DECIMAL(18, 2) NOT NULL, -- Can be 0 for Zeros
    GiftFee DECIMAL(18, 2) DEFAULT 0,
    GiftMethod NVARCHAR(50) NOT NULL, -- Check, CC, Zero, etc.
    GiftPlatform NVARCHAR(50) NOT NULL, -- Cage, Stripe, etc.
    GiftDate DATETIME2 NOT NULL,
    BatchID INT NULL FOREIGN KEY REFERENCES Batches(BatchID),
    BatchDate DATETIME2 NULL,
    IsVoid BIT DEFAULT 0,
    VoidReason NVARCHAR(255) NULL,
    CreatedBy INT NULL FOREIGN KEY REFERENCES Users(UserID),
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

-- BankDeposits Table (Payouts)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BankDeposits]') AND type in (N'U'))
BEGIN
CREATE TABLE BankDeposits (
    BankDepositID INT IDENTITY(1,1) PRIMARY KEY,
    ClientID INT NOT NULL FOREIGN KEY REFERENCES Clients(ClientID),
    PayoutSourcePlatform NVARCHAR(50) NOT NULL,
    ExternalPayoutID NVARCHAR(100) NOT NULL,
    PayoutDate DATE NOT NULL,
    DepositAmount DECIMAL(18, 2) NOT NULL,
    PayoutCompositeID NVARCHAR(255) NOT NULL UNIQUE, -- {ClientID}.{Platform}.{Date}.{ExternalID}
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    CreatedBy INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
END
GO

-- DepositDonationLinks Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DepositDonationLinks]') AND type in (N'U'))
BEGIN
CREATE TABLE DepositDonationLinks (
    LinkID INT IDENTITY(1,1) PRIMARY KEY,
    BankDepositID INT NOT NULL FOREIGN KEY REFERENCES BankDeposits(BankDepositID),
    DonationID INT NOT NULL FOREIGN KEY REFERENCES Donations(DonationID),
    AmountApplied DECIMAL(18, 2) NOT NULL
);
END
GO
