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
    DefaultGiftQuarter?: string;
    PaymentCategory: string;
}

export interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
}

export interface DonationRecord {
    DonationID: number;
    GiftAmount: number;
    GiftPledgeAmount?: number;
    GiftFee?: number;
    SecondaryID?: string; // AI Linking
    ScanDocumentID?: number;
    ScanPageNumber?: number;
    ScanString?: string;
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
    PostMarkYear?: number; // NEW
    PostMarkQuarter?: string; // NEW
    IsInactive?: boolean; // NEW
    GiftYear?: number; // NEW
    GiftQuarter?: string; // NEW
    DonorPrefix?: string; // NEW
    DonorEmail?: string;
    OrganizationName?: string;
    Comment?: string;
    GiftCustodian?: string;
    GiftConduit?: string;
}
