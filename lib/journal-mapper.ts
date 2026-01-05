export interface RowDefinition {
    id?: string;
    JournalNo: string;
    JournalDate: string;
    AccountName: string;
    Debits: string;
    Credits: string;
    Description: string;
    Name: string;
    Currency: string;
    Location: string;
    Class: string;
    [key: string]: string | undefined;
}

export interface Template {
    id: number;
    name: string;
    mappings: RowDefinition[];
}

export const JOURNAL_HEADERS = [
    'JournalNo', 'JournalDate', 'AccountName', 'Debits', 'Credits',
    'Description', 'Name', 'Currency', 'Location', 'Class'
];

export function generateJournalRows(donations: any[], template: Template) {
    const results = [];

    for (const donation of donations) {
        // Helper for interpolation
        const replacer = (val: string) => {
            if (!val) return '';
            return val
                .replace(/{BatchCode}/g, donation.BatchCode || '')
                .replace(/{Date}/g, new Date(donation.Date).toLocaleDateString())
                .replace(/{Amount}/g, donation.GiftAmount || '0')
                .replace(/{DonorName}/g, `${donation.FirstName || ''} ${donation.LastName || ''}`.trim())
                .replace(/{PaymentMethod}/g, donation.GiftMethod || '')
                .replace(/{CheckNumber}/g, donation.CheckNumber || '')
                .replace(/{Platform}/g, donation.GiftPlatform || '')
                .replace(/{TransactionType}/g, donation.TransactionType || '')
                .replace(/{Fund}/g, '') // Placeholder for future
                .replace(/{Campaign}/g, ''); // Placeholder for future
        };

        for (const rowDef of template.mappings) {
            const row: any = {};
            // Also include original donation ID for UI keys
            row._donationId = donation.DonationID;

            for (const header of JOURNAL_HEADERS) {
                const rawValue = rowDef[header] || '';
                row[header] = replacer(rawValue);
            }
            results.push(row);
        }
    }

    return results;
}
