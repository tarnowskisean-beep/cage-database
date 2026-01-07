
import { query } from '../lib/db';

async function testInsert() {
    try {
        console.log('Finding open batch...');
        const batchRes = await query('SELECT "BatchID", "ClientID", "Date" FROM "Batches" WHERE "Status" = \'Open\' LIMIT 1');
        if (batchRes.rows.length === 0) {
            console.log('No open batch found. Creating one...');
            // ... skip creation for now, assume one exists or fail
            return;
        }
        const batch = batchRes.rows[0];
        console.log('Using Batch:', batch.BatchID);

        const params = [
            batch.ClientID, // $1
            batch.BatchID, // $2
            100.00, // $3 Amount
            '1234', // $4 SecondaryID
            '1234', // $5 CheckNumber
            null, // $6 ScanString
            'Check', // $7 GiftMethod
            'Cage', // $8 GiftPlatform
            batch.Date, // $9 BatchDate
            'Individual', // $10 GiftType
            2025, // $11 GiftYear
            'Q1', // $12 GiftQuarter
            'test@example.com', // $13 Email
            '555-0199', // $14 Phone
            '', // $15 Org
            null, // $16 Prefix
            'Test', // $17 First
            null, // $18 Middle
            'Donor', // $19 Last
            null, // $20 Suffix
            '123 Main St', // $21 Address
            'City', // $22 City
            'ST', // $23 State
            '12345', // $24 Zip
            null, // $25 Employer
            null, // $26 Occ
            0, // $27 Pledge
            0, // $28 Fee
            null, // $29 Custodian
            null, // $30 Conduit
            '2025', // $31 ReceiptYear
            'Q1', // $32 ReceiptQuarter
            false, // $33 IsInactive
            'Test Comment', // $34 Comment
            null // $35 CampaignID
        ];

        console.log('Executing INSERT...');
        const res = await query(
            `INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", 
             "TransactionType", "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate",
             "GiftType", "GiftYear", "GiftQuarter", 
             "DonorEmail", "DonorPhone", "OrganizationName",
             "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
             "DonorAddress", "DonorCity", "DonorState", "DonorZip",
             "DonorEmployer", "DonorOccupation",
             "GiftPledgeAmount", "GiftFee", "GiftCustodian", "GiftConduit",
             "ReceiptYear", "ReceiptQuarter", "IsInactive", "Comment",
             "CampaignID"
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
            RETURNING *`,
            params
        );
        console.log('INSERT SUCCESS:', res.rows[0].DonationID);

    } catch (e) {
        console.error('INSERT FAILED:', e);
    }
}

testInsert();
