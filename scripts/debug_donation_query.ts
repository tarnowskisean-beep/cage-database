
const columns = [
    "ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString",
    "TransactionType", "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate",
    "GiftType", "GiftYear", "GiftQuarter",
    "DonorEmail", "DonorPhone", "OrganizationName",
    "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
    "DonorAddress", "DonorCity", "DonorState", "DonorZip",
    "DonorEmployer", "DonorOccupation",
    "GiftPledgeAmount", "GiftFee", "GiftCustodian", "GiftConduit",
    "ReceiptYear", "ReceiptQuarter", "IsInactive", "Comment",
    "CampaignID"
];

const counts: Record<string, number> = {};
let hasDupes = false;

columns.forEach(c => {
    counts[c] = (counts[c] || 0) + 1;
    if (counts[c] > 1) {
        console.error(`DUPLICATE COLUMN: ${c}`);
        hasDupes = true;
    }
});

if (!hasDupes) {
    console.log("No duplicate columns found in the list.");
}
