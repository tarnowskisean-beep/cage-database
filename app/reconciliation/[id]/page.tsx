
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReconciliationDetail({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string>('');

    // Unpack Params
    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    const [period, setPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Reconciliation State
    const [statementBalance, setStatementBalance] = useState<number>(0);
    const [statementLink, setStatementLink] = useState<string>('');
    const [clearedItems, setClearedItems] = useState<Set<string>>(new Set()); // IDs of cleared items

    // Calculated
    const [clearedBalance, setClearedBalance] = useState<number>(0);
    const [difference, setDifference] = useState<number>(0);

    const router = useRouter();

    // Fetch Data
    useEffect(() => {
        if (!id) return;
        // Mock Data for now as backend routes for details aren't fully fleshed out with new columns
        // Ideally: fetch(`/api/reconciliation/periods/${id}`)

        // Mocking structure for UI development
        setPeriod({
            ReconciliationPeriodID: id,
            PeriodStartDate: '2025-01-01',
            PeriodEndDate: '2025-01-07',
            Status: 'Open',
            StatementEndingBalance: 0,
            ClientName: 'Mock Client',
            // Detailed Items
            batches: [
                { id: 'b1', date: '2025-01-02', type: 'Batch', desc: 'Checks Batch #101', amount: 5000.00 },
                { id: 'b2', date: '2025-01-03', type: 'Batch', desc: 'Credit Card Batch #102', amount: 1250.50 }
            ],
            payments: [
                { id: 'p1', date: '2025-01-05', type: 'Fee', desc: 'Stripe Fees', amount: -45.20 },
                { id: 'p2', date: '2025-01-06', type: 'Transfer', desc: 'Previous Transfer', amount: -6000.00 }
            ]
        });
        setLoading(false);
    }, [id]);

    // Update Calculations
    useEffect(() => {
        if (!period) return;

        // Simulating "Beginning Balance" (would come from DB)
        const beginningBalance = 0;
        const [endingBalance, setEndingBalance] = useState('');
        const [statementLink, setStatementLink] = useState('');
        const [clearedItems, setClearedItems] = useState<Set<number>>(new Set());
        const [submitting, setSubmitting] = useState(false);

        useEffect(() => {
            if (!periodId) return;
            fetch(`/api/reconciliation/periods/${periodId}`)
                .then(res => res.json())
                .then(d => {
                    setData(d);
                    setEndingBalance(d.period.StatementEndingBalance || '');
                    setStatementLink(d.period.StatementLink || '');
                    // Auto-clear logic would go here
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }, [periodId]);

        const handleUpdate = async () => {
            await fetch(`/api/reconciliation/periods/${periodId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statementEndingBalance: endingBalance, statementLink })
            });
        };

        const handleReconcile = async () => {
            if (difference !== 0) return alert('Difference must be 0.00');
            setSubmitting(true);
            try {
                const res = await fetch(`/api/reconciliation/periods/${periodId}/reconcile`, { method: 'POST' });
                if (res.ok) window.location.reload();
                else alert('Failed to reconcile');
            } catch (e) {
                console.error(e);
            } finally {
                setSubmitting(false);
            }
        };

        // Calculations
        // For now, mock checkboxes just visually update. In real app, we persist "Cleared" status.
        // Assuming ALL system items (Batches) are "Cleared" by default for this workflow?
        // Let's assume user accepts all batches.
        const moneyIn = data?.moneyIn.reduce((sum: number, b: any) => sum + Number(b.AmountDonorNet), 0) || 0;
        const moneyOut = data?.moneyOut.reduce((sum: number, tx: any) => sum + Number(tx.AmountOut || 0), 0) || 0;

        // In this simplified view, System Balance = Cleared Balance
        // Difference = Statement Balance (User Input) - (Beginning + Money In - Money Out)
        // Assuming Beginning is 0 for this demo or carried forward.
        const calculatedBalance = moneyIn - moneyOut;
        const statementBalNum = parseFloat(endingBalance) || 0;
        const difference = statementBalNum - calculatedBalance;
        const isBalanced = Math.abs(difference) < 0.01;

        if (loading) return <div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-gray-500 animate-pulse">Loading secure ledger...</div>;
        if (!data) return <div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-red-500">Period not found</div>;

        return (
            <tr key={item.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleClear(item.id)}>
                <td className="p-2 text-center">
                    <input
                        type="checkbox"
                        checked={clearedItems.has(item.id)}
                        readOnly
                    />
                </td>
                <td className="p-2">{item.date}</td>
                <td className="p-2">{item.desc}</td>
                <td className="p-2 text-right font-mono">${Math.abs(item.amount).toFixed(2)}</td>
            </tr>
        ))
}
                            </tbody >
                        </table >
                    </div >
                </div >

            </div >

    <div className="mt-4 text-center">
        <button className="text-sm text-blue-600 hover:underline"> Upload Bank CSV (Auto-Match)</button>
    </div>
        </div >
    );
}
