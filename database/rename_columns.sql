
-- Rename MailCode to CampaignID in Donations table
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Donations]') AND name = 'MailCode')
BEGIN
    EXEC sp_rename 'Donations.MailCode', 'CampaignID', 'COLUMN';
END
GO

-- Rename MailCode to CampaignID in Donors table
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Donors]') AND name = 'MailCode')
BEGIN
    EXEC sp_rename 'Donors.MailCode', 'CampaignID', 'COLUMN';
END
GO

-- Rename Pledges MailCode if exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Pledges]') AND name = 'MailCode')
BEGIN
    EXEC sp_rename 'Pledges.MailCode', 'CampaignID', 'COLUMN';
END
GO

-- Rename PostmarkYear to ReceiptYear in Donations table
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Donations]') AND name = 'PostmarkYear')
BEGIN
    EXEC sp_rename 'Donations.PostmarkYear', 'ReceiptYear', 'COLUMN';
END
GO

-- Rename PostmarkQuarter to ReceiptQuarter in Donations table
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Donations]') AND name = 'PostmarkQuarter')
BEGIN
    EXEC sp_rename 'Donations.PostmarkQuarter', 'ReceiptQuarter', 'COLUMN';
END
GO
