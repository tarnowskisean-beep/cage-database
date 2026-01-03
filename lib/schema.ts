import { z } from 'zod';

export const CreateBatchSchema = z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    entryMode: z.enum(['Barcode', 'Manual', 'ZerosOCR']),
    paymentCategory: z.string(),
    zerosType: z.string().optional(),

    // Defaults
    date: z.string().optional(), // YYYY-MM-DD
    defaultGiftMethod: z.string().optional().default('Check'),
    defaultGiftPlatform: z.string().optional().default('Cage'),
    defaultTransactionType: z.string().optional().default('Donation'),
    defaultGiftYear: z.number().int().optional(),
    defaultGiftQuarter: z.string().optional(),
    defaultGiftType: z.string().optional(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
