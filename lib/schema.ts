import { z } from 'zod';

export const CreateBatchSchema = z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    entryMode: z.enum(['Scan/Barcode', 'Manual', 'Zeros', 'Import', 'Data Entry']), // Added Data Entry for backwards compat if needed
    paymentCategory: z.string(),
    zerosType: z.string().optional(),

    // Defaults
    date: z.string().optional(), // YYYY-MM-DD
    defaultGiftMethod: z.string().optional().default('Check'),
    defaultGiftPlatform: z.string().optional().default('Chainbridge'),
    defaultTransactionType: z.string().optional().default('Contribution'),
    defaultGiftYear: z.number().int().optional(),
    defaultGiftQuarter: z.string().optional(),
    defaultGiftType: z.string().optional(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
