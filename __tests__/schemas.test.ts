import { describe, it, expect } from 'vitest';
import { CreateBatchSchema, CreateDonationSchema } from '../lib/schemas';

describe('Zod Schemas', () => {
    describe('CreateBatchSchema', () => {
        it('validates a correct batch payload', () => {
            const payload = {
                clientId: 123,
                date: '2025-01-01',
                description: 'Test Batch',
                entryMode: 'Manual',
                paymentCategory: 'Donations',
                defaultGiftMethod: 'Check',
                defaultGiftPlatform: 'Cage'
            };
            const result = CreateBatchSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it('transforms string clientId to number', () => {
            const payload = {
                clientId: '456',
                date: '2025-01-01'
            };
            const result = CreateBatchSchema.safeParse(payload);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.clientId).toBe(456);
            }
        });
    });

    describe('CreateDonationSchema', () => {
        it('validates a correct donation payload', () => {
            const payload = {
                amount: 100.50,
                checkNumber: '1001',
                mailCode: 'CODE123',
                giftMethod: 'Check',
                donorFirstName: 'John',
                donorLastName: 'Doe'
            };
            const result = CreateDonationSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it('allows null/optional fields for MailCode', () => {
            const payload = {
                amount: 50,
                mailCode: null, // explicit null
                scanString: undefined // undefined
            };
            const result = CreateDonationSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it('fails if amount is missing/invalid', () => {
            const payload = {
                checkNumber: '100',
                donorFirstName: 'Test'
            };
            const result = CreateDonationSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });
    });
});
