import { z } from 'zod';
import { METHODS, PLATFORMS, GIFT_TYPES, TRANSACTION_TYPES, YES_NO_OPTIONS } from '@/lib/constants';

// --- Shared Enums/Literals ---
const MethodEnum = z.enum(['Check', 'Cash', 'Credit Card', 'Online', 'EFT', 'Stock', 'Crypto', 'In-Kind', 'Mixed', 'Zeros']); // Added 'Mixed', 'Zeros' for Batch Categories
const PlatformEnum = z.enum(PLATFORMS as [string, ...string[]]);
const GiftTypeEnum = z.enum(GIFT_TYPES as [string, ...string[]]);
const TransactionTypeEnum = z.enum(TRANSACTION_TYPES as [string, ...string[]]);

// --- Batch Schema ---
export const CreateBatchSchema = z.object({
    clientId: z.union([z.string(), z.number()]).transform(val => Number(val)),
    date: z.string().optional(), // ISO date string
    description: z.string().optional().nullable(),
    entryMode: z.string().default('Manual'),
    paymentCategory: z.string().default('Donations'),
    zerosType: z.string().optional().nullable(),

    // Defaults
    defaultGiftMethod: z.string().optional().default('Check'),
    defaultGiftPlatform: z.string().optional().default('Cage'),
    defaultTransactionType: z.string().optional().default('Donation'),
    defaultGiftYear: z.union([z.string(), z.number()]).optional().transform(v => Number(v)),
    defaultGiftQuarter: z.string().optional().default('Q1'),
    defaultGiftType: z.string().optional().default('Individual/IRA/Trust'),

    accountId: z.string().optional(), // For Account Selection
});

// --- Donation Schema ---
export const CreateDonationSchema = z.object({
    // Financials
    amount: z.union([z.string(), z.number()]).transform(v => parseFloat(String(v))),
    checkNumber: z.string().optional().nullable(),
    scanString: z.string().optional().nullable(),
    campaignId: z.string().optional().nullable(), // Renamed from MailCode

    // Coding
    giftMethod: z.string().optional(), // Flexible string or Enum?
    giftPlatform: z.string().optional(),
    giftType: z.string().optional(),
    giftYear: z.union([z.string(), z.number()]).optional(),
    giftQuarter: z.string().optional(),
    postMarkYear: z.string().optional(), // Deprecated input key, mapped to ReceiptYear
    postMarkQuarter: z.string().optional(), // Deprecated input key, mapped to ReceiptQuarter

    // Donor Info
    donorPrefix: z.string().optional().nullable(),
    donorFirstName: z.string().optional().nullable(),
    donorMiddleName: z.string().optional().nullable(),
    donorLastName: z.string().optional().nullable(),
    donorSuffix: z.string().optional().nullable(),
    donorEmail: z.string().email().optional().or(z.literal('')).nullable(),
    donorPhone: z.string().optional().nullable(),
    donorAddress: z.string().optional().nullable(),
    donorCity: z.string().optional().nullable(),
    donorState: z.string().optional().nullable(),
    donorZip: z.string().optional().nullable(),
    donorEmployer: z.string().optional().nullable(),
    donorOccupation: z.string().optional().nullable(),
    organizationName: z.string().optional().nullable(),

    // Extra
    giftPledgeAmount: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : 0),
    giftFee: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(String(v)) : 0),
    giftCustodian: z.string().optional().nullable(),
    giftConduit: z.string().optional().nullable(),
    isInactive: z.union([z.boolean(), z.string()]).optional().transform(v => v === true || v === 'True'),
    comment: z.string().optional().nullable(),
});

export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
export type CreateDonationInput = z.infer<typeof CreateDonationSchema>;
