import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReconciliationStart from '../app/reconciliation/page';
import ReconciliationWorkspace from '../app/reconciliation/[id]/page';

// Mock Next.js router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: pushMock,
    }),
    useParams: () => ({ id: '123' }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Reconciliation Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Start Screen: submits form and redirects', async () => {
        // Mock Clients
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ([{ ClientID: '1', ClientCode: 'TEST', ClientName: 'Test Client' }]),
        });

        // Mock History (triggered by clientId change)
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ([]),
        });

        // Mock Create Response
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ReconciliationPeriodID: '999' }),
        });

        render(<ReconciliationStart />);

        // Wait for clients to load
        await waitFor(() => screen.getByText(/Test Client/i));

        // Fill Form
        fireEvent.change(screen.getByLabelText(/Statement ending balance/i), { target: { value: '500.00' } });
        fireEvent.change(screen.getByLabelText(/Statement ending date/i), { target: { value: '2025-12-31' } });

        // Submit
        fireEvent.click(screen.getByText(/Start reconciling/i));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/reconciliation/periods', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"statementEndingBalance":500'),
            }));
            expect(pushMock).toHaveBeenCalledWith('/reconciliation/999');
        });
    });

    it('Workspace: calculates difference correctly', async () => {
        (fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/reconciliation/periods/')) {
                // If it ends with /reconcile or /items (PATCH), mock success
                if (url.endsWith('/reconcile')) return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
                if (url.endsWith('/items')) return Promise.resolve({ ok: true, json: async () => ({ success: true }) });

                // Main GET
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        ReconciliationPeriodID: '123',
                        StatementEndingBalance: 500.00,
                        PeriodEndDate: '2025-12-31',
                        ClientName: 'Test Client',
                        ClientCode: 'TEST',
                        Status: 'Open',
                        batches: [{ id: 'b1', type: 'Batch', date: '2025-01-01', amount: 200, desc: 'Batch 1', cleared: false }],
                        payments: [{ id: 't1', type: 'Payment', date: '2025-01-01', amount: 100, desc: 'Txn 1', cleared: false }]
                    })
                });
            }
            return Promise.reject(new Error(`Unknown URL: ${url}`));
        });

        render(<ReconciliationWorkspace params={Promise.resolve({ id: '123' })} />);

        await waitFor(() => screen.getByText(/TEST/i));

        // Initial State: 
        // Statement: 500
        // Beginning: 100 (Hardcoded in component for now)
        // Cleared: 100 (Begin) - 0 + 0 = 100
        // Diff: 500 - 100 = 400
        // Note: The mock data has uncleared items, so clearedBalance = startBalance (100)
        expect(screen.getByText(/\$400.00/)).toBeDefined();
    });
});
