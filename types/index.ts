export interface Batch {
    BatchID: number;
    BatchCode: string;
    ClientCode: string;
    ClientID: number;
    Date: string;
    Status: string;
    EntryMode?: string;
    DefaultGiftPlatform?: string;
    DefaultGiftType?: string;
    DefaultGiftMethod?: string;
    DefaultGiftYear?: number;
    DefaultTransactionType?: string; // New Field
    DefaultGiftQuarter?: string;
    ImportSessionID?: number;
    PaymentCategory: string;
}

export interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
}

export interface DonationRecord {
    DonationID: number;
    BatchID: number;
    ClientID: number;
    GiftAmount: number;
    GiftPledgeAmount?: number;
    GiftFee?: number;
    SecondaryID: string; // Used for Check # or Auth Code
    CheckNumber?: string;
    ScanDocumentID?: number;
    ScanPageNumber?: number;
    ScanString: string;
    TransactionType?: string; // New Field
    // Audit
    CreatedAt: string;
    CreatedBy: string;
    LastModifiedAt?: string;
    LastModifiedBy?: string;
    GiftMethod: string;
    GiftType: string;
    DonorFirstName?: string;
    DonorLastName?: string;
    DonorMiddleName?: string;
    DonorSuffix?: string;
    DonorEmployer?: string;
    DonorOccupation?: string;
    DonorAddress?: string;
    DonorCity?: string;
    DonorState?: string;
    DonorZip?: string;
    DonorPhone?: string;
    GiftPlatform?: string; // NEW
    ReceiptYear?: number; // NEW
    ReceiptQuarter?: string; // NEW
    IsInactive?: boolean; // NEW
    GiftYear?: number; // NEW
    GiftQuarter?: string; // NEW
    DonorPrefix?: string; // NEW
    DonorEmail?: string;
    OrganizationName?: string;
    Comment?: string;
    GiftCustodian?: string;
    GiftConduit?: string;
    CampaignID?: string; // Renamed from MailCode
}
