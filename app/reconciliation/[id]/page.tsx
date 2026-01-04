
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

        // Sum Checked Items
        let sumCleared = beginningBalance;

        // In real app, we iterate all items and check if clearedItems.has(item.id)
        // Mock logic:
        const allItems = [...(period.batches || []), ...(period.payments || [])];
        allItems.forEach(item => {
            if (clearedItems.has(item.id)) {
                sumCleared += item.amount;
            }
        });

        setClearedBalance(sumCleared);
        setDifference(statementBalance - sumCleared);

    }, [statementBalance, clearedItems, period]);


    const toggleClear = (itemId: string) => {
        const next = new Set(clearedItems);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        setClearedItems(next);
    };

    const handleSave = async () => {
        // Implement Save Logic (PATCH)
        alert('Saving...');
    }

    const handleFinish = async () => {
        if (difference !== 0) {
            alert('Cannot finish. Difference must be 0.00');
            return;
        }
        if (!statementLink) {
            alert('Please attach a Statement Link (Google Drive) before finishing.');
            return;
        }
        // Implement Finish Logic
        alert('Reconciling...');
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div>
            {/* Sticky Header */}
            <header className="page-header sticky top-0 bg-white z-10 shadow-sm pt-4 pb-2 px-6 -mx-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <Link href="/reconciliation" className="text-gray-500 hover:text-gray-800 text-sm">&larr; Back to Dashboard</Link>
                        <h1 className="text-xl font-bold mt-1">{period.ClientName} - Reconciliation</h1>
                        <p className="text-xs text-gray-500">{period.PeriodStartDate} to {period.PeriodEndDate}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="btn-secondary text-sm px-3 py-1">Save for Later</button>
                        <button
                            onClick={handleFinish}
                            disabled={difference !== 0}
                            className={`btn-primary text-sm px-4 py-1 ${difference !== 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Finish Now
                        </button>
                    </div>
                </div>

                {/* Scrubber Bar */}
                <div className="flex gap-8 items-center bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Statement Ending Balance</span>
                        <input
                            type="number"
                            className="bg-transparent border-b border-blue-300 font-mono font-bold w-32 focus:outline-none"
                            value={statementBalance}
                            onChange={e => setStatementBalance(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Avg. Cleared Balance</span>
                        <span className="font-mono font-bold text-gray-700">${clearedBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Difference</span>
                        <span className={`font-mono font-bold ${difference === 0 ? 'text-green-600' : 'text-red-500'}`}>
                            ${difference.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">Statement Link (Google Drive)</span>
                        <input
                            type="text"
                            className="bg-white border rounded px-2 py-1 w-full text-xs"
                            placeholder="https://drive.google.com/file/d/..."
                            value={statementLink}
                            onChange={e => setStatementLink(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Split View */}
            <div className="grid grid-cols-2 gap-6 h-[calc(100vh-250px)] overflow-hidden">

                {/* Money IN (Deposits) */}
                <div className="glass-panel p-0 flex flex-col h-full">
                    <div className="p-3 border-b bg-green-50/50">
                        <h3 className="font-bold text-green-800 text-sm uppercase">Money In (Deposits & Credits)</h3>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-2 w-8">✓</th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {period.batches && period.batches.map((item: any) => (
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
                                        <td className="p-2 text-right font-mono">${item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Money OUT (Payments) */}
                <div className="glass-panel p-0 flex flex-col h-full">
                    <div className="p-3 border-b bg-red-50/50">
                        <h3 className="font-bold text-red-800 text-sm uppercase">Money Out (Checks & Payments)</h3>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-2 w-8">✓</th>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {period.payments && period.payments.map((item: any) => (
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div className="mt-4 text-center">
                <button className="text-sm text-blue-600 hover:underline"> Upload Bank CSV (Auto-Match)</button>
            </div>
        </div>
    );
}
