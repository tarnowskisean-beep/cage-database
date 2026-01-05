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
            console.log('Fetching:', url);
            if (url.includes('/items')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        transactions: [{ BankTransactionID: 't1', AmountOut: 100, TransactionDate: '2025-01-01' }],
                        batches: [{ BatchID: 'b1', AmountDonorNet: 200, DepositDate: '2025-01-01' }],
                        cleared: []
                    })
                });
            }
            if (url.includes('/api/reconciliation/periods/')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        ReconciliationPeriodID: '123',
                        StatementEndingBalance: 500.00,
                        PeriodEndDate: '2025-12-31',
                        ClientName: 'Test Client',
                        Status: 'Open'
                    })
                });
            }
            return Promise.reject(new Error(`Unknown URL: ${url}`));
        });

        render(<ReconciliationWorkspace params={Promise.resolve({ id: '123' })} />);

        await waitFor(() => screen.getByText(/Test Client/i));

        // Initial State: 
        // Statement: 500
        // Beginning: 100 (Hardcoded in component for now)
        // Cleared: 100 (Begin) - 0 + 0 = 100
        // Diff: 500 - 100 = 400
        expect(screen.getByText(/\$400.00/)).toBeDefined();

        // Toggle Payment (t1, $100)
        // New Cleared: 100 - 100 = 0
        // Diff: 500 - 0 = 500

        // Currently testing UI toggle logic might be complex without comprehensive mocking of the toggleClear function's optimistic update which depends on state.
        // But the component logic:
        // const clearedBalance = beginBalance - clearedPaymentsSum + clearedDepositsSum;
        // should update immediately on click.
    });
});
