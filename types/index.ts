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
    SecondaryID?: string; // Check Number
    ScanString?: string;
    CreatedAt: string;
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
    DonorEmail?: string;
    Comment?: string;
}
