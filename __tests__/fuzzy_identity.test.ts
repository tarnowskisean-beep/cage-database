
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveDonationIdentity } from '@/lib/people';
import { query } from '@/lib/db';

// Mock the DB
vi.mock('@/lib/db', () => ({
    query: vi.fn(),
}));

describe('Smart Deduplication (Fuzzy Layout)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('TIER 1: Matches on Exact Email', async () => {
        (query as any).mockResolvedValueOnce({ rows: [{ DonorID: 101 }] }); // Email match check

        const id = await resolveDonationIdentity({
            DonorEmail: 'test@example.com',
            DonorFirstName: 'New',
            DonorLastName: 'Person'
        });

        expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT "DonorID" FROM "Donors" WHERE LOWER("Email")'), expect.anything());
        expect(id).toBe(101);
    });

    it('TIER 2: Matches on Exact Name', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] }); // Email fail
        (query as any).mockResolvedValueOnce({ rows: [{ DonorID: 102 }] }); // Name match

        const id = await resolveDonationIdentity({
            DonorFirstName: 'John',
            DonorLastName: 'Doe'
        });

        expect(id).toBe(102);
    });

    it('TIER 3: Matches on Fuzzy Name (Common Last + Zip + Similar First)', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] }); // Email fail
        (query as any).mockResolvedValueOnce({ rows: [] }); // Exact Name fail
        (query as any).mockResolvedValueOnce({ rows: [{ DonorID: 103, score: 0.8 }] }); // Fuzzy Name match

        const id = await resolveDonationIdentity({
            DonorFirstName: 'Jon',
            DonorLastName: 'Doe',
            DonorZip: '90210'
        });

        // Verify it called the similarity query
        expect(query).toHaveBeenCalledWith(expect.stringContaining('similarity("FirstName", $1)'), expect.arrayContaining(['Jon', 'Doe', '90210']));
        expect(id).toBe(103);
    });

    it('TIER 4: Matches on Fuzzy Address (Common Last + Similar Address)', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] }); // Email fail
        (query as any).mockResolvedValueOnce({ rows: [] }); // Exact Name fail
        // Tier 3 skipped due to no zip
        (query as any).mockResolvedValueOnce({ rows: [{ DonorID: 104, score: 0.9 }] }); // Fuzzy Address match
        (query as any).mockResolvedValueOnce({ rows: [] }); // Update success

        const id = await resolveDonationIdentity({
            DonorFirstName: 'Jane',
            DonorLastName: 'Doe',
            DonorAddress: '123 Main St'
        });

        expect(query).toHaveBeenCalledWith(expect.stringContaining('similarity("Address", $1)'), expect.arrayContaining(['123 Main St', 'Doe']));
        expect(id).toBe(104);
    });
});
