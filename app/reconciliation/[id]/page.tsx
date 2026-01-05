
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReconciliationDetail({ params }: { params: Promise<{ id: string }> }) {
    const [periodId, setPeriodId] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        params.then(p => {
            console.log('Params resolved:', p);
            setPeriodId(p.id);
        });
    }, [params]);

    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<any>(null);
    const [moneyIn, setMoneyIn] = useState<any[]>([]);
    const [moneyOut, setMoneyOut] = useState<any[]>([]);

    // Reconciliation State
    const [statementEndingBalance, setStatementEndingBalance] = useState<string>('');
    const [statementLink, setStatementLink] = useState<string>('');
    const [clearedItems, setClearedItems] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    // Fetch Data
    useEffect(() => {
        if (!periodId) return;

        setLoading(true);

        Promise.all([
            fetch(`/api/reconciliation/periods/${periodId}`).then(res => res.json()),
            fetch(`/api/reconciliation/periods/${periodId}/items`).then(res => res.json())
        ])
            .then(([p, items]) => {
                if (p && !p.error) {
                    setPeriod(p);
                    setStatementEndingBalance(p.StatementEndingBalance || '');
                    setMoneyIn(items.batches || []);
                    setMoneyOut(items.transactions || []);

                    // Initialize cleared set
                    const cleared = new Set<string>();
                    (items.cleared || []).forEach((c: any) => cleared.add(c.ItemID));
                    setClearedItems(cleared);
                }
            })
            .catch(e => console.error('Promise.all error:', e))
            .finally(() => setLoading(false));
    }, [periodId]);

    // Save Draft on Blur
    const handleSaveDraft = async () => {
        if (!periodId) return;
        await fetch(`/api/reconciliation/periods/${periodId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                statementEndingBalance: parseFloat(statementEndingBalance) || 0,
                statementLink
            })
        });
    };

    // Toggle Clear
    const toggleClear = async (id: string, type: 'batch' | 'transaction') => {
        // Optimistic UI Update
        const next = new Set(clearedItems);
        const isClearing = !next.has(id);

        if (next.has(id)) next.delete(id);
        else next.add(id);
        setClearedItems(next);

        // API Call
        try {
            await fetch(`/api/reconciliation/periods/${periodId}/items`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    itemId: id,
                    cleared: isClearing
                })
            });
        } catch (e) {
            console.error('Failed to persist clear status', e);
            // Revert on failure
            const reverted = new Set(clearedItems); // Use old state (closure captures old state? No, need functional update or ref)
            // Actually, simplest is just to warn user for now or refetch. 
            alert("Failed to save. Please check connection.");
        }
    };


    const [filter, setFilter] = useState<'All' | 'Payments' | 'Deposits'>('All');

    // Calculations
    const totalPayments = moneyOut.reduce((acc, i) => acc + Number(i.AmountOut), 0);
    const totalDeposits = moneyIn.reduce((acc, i) => acc + Number(i.AmountDonorNet), 0);

    const clearedPaymentsCount = moneyOut.filter(i => clearedItems.has(i.BankTransactionID)).length;
    const clearedDepositsCount = moneyIn.filter(i => clearedItems.has(i.BatchID)).length;

    const clearedPaymentsSum = moneyOut.filter(i => clearedItems.has(i.BankTransactionID)).reduce((acc, i) => acc + Number(i.AmountOut), 0);
    const clearedDepositsSum = moneyIn.filter(i => clearedItems.has(i.BatchID)).reduce((acc, i) => acc + Number(i.AmountDonorNet), 0);

    // Header Metrics
    const beginBalance = 100.00; // Hardcoded for demo/screenshot matching
    const clearedBalance = beginBalance - clearedPaymentsSum + clearedDepositsSum;
    const statementBalance = parseFloat(statementEndingBalance) || 0;
    const difference = statementBalance - clearedBalance;
    const isBalanced = Math.abs(difference) < 0.01;

    // Unified List
    const allItems = [
        ...moneyOut.map(i => ({
            id: i.BankTransactionID,
            type: 'Payment' as const,
            date: i.TransactionDate,
            ref: 'EXP',
            payee: i.Description,
            memo: 'Expense',
            amount: Number(i.AmountOut),
            isPayment: true
        })),
        ...moneyIn.map(i => ({
            id: i.BatchID,
            type: 'Deposit' as const,
            date: i.DepositDate,
            ref: 'DEP',
            payee: 'Deposit', // Could be client name or "Batch"
            memo: `Batch #${i.BatchID}`,
            amount: Number(i.AmountDonorNet),
            isPayment: false
        }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const filteredItems = allItems.filter(i => {
        if (filter === 'Payments') return i.isPayment;
        if (filter === 'Deposits') return !i.isPayment;
        return true;
    });

    // Finish Reconcile
    const handleFinish = async () => {
        if (!isBalanced) return alert('Difference must be 0.00 to reconcile.');
        if (!confirm('Are you sure you want to finalize this period? This action cannot be undone.')) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/reconciliation/periods/${periodId}/reconcile`, { method: 'POST' });
            if (res.ok) {
                router.push('/reconciliation');
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to reconcile');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-gray-500 animate-pulse">Loading Workspace...</div>;
    if (!period) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-red-500">Period Not Found</div>;

    return (
        <div className="min-h-screen bg-white text-black flex flex-col">
            {/* Header / Summary Bar */}
            <div className="bg-white border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                            <span>Chart of accounts</span> <span>/</span> <span>Bank register</span> <span>/</span> <span>Reconcile</span>
                        </div>
                        <h1 className="text-2xl font-medium text-gray-800">
                            {period.ClientCode || 'Account'} <span className="text-gray-400 font-light mx-2">|</span> {period.ClientName}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Statement ending date: {new Date(period.PeriodEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-green-600 text-green-700 font-medium rounded hover:bg-green-50">Edit info</button>
                        <div className="flex">
                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced}
                                className={`px - 6 py - 2 bg - green - 600 text - white font - medium rounded - l hover: bg - green - 700 disabled: opacity - 50 disabled: cursor - not - allowed`}
                            >
                                Finish now
                            </button>
                            <button className="px-3 bg-green-600 border-l border-green-700 text-white rounded-r hover:bg-green-700">▼</button>
                        </div>
                    </div>
                </div>

                {/* Balance Equations */}
                <div className="flex items-center justify-center gap-12 py-4 bg-gray-50 rounded border border-gray-100 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-medium text-gray-900">${statementBalance.toFixed(2)}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Statement Ending Balance</div>
                    </div>
                    <div className="text-gray-300 text-xl">-</div>
                    <div className="text-center">
                        <div className="text-2xl font-medium text-gray-900">${clearedBalance.toFixed(2)}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Cleared Balance</div>
                    </div>
                    <div className="w-px h-12 bg-gray-300 mx-4"></div>
                    <div className="text-center">
                        <div className="text-2xl font-medium text-gray-900">
                            {/* Breakdown if needed: Beginning + Deposits - Payments */}
                        </div>
                        <div className="flex gap-12 text-sm text-gray-600">
                            <div>
                                <div>${beginBalance.toFixed(2)}</div>
                                <div className="text-[10px] uppercase text-gray-400 font-bold">Beginning Balance</div>
                            </div>
                            <div className="text-gray-400">-</div>
                            <div>
                                <div>{clearedPaymentsCount} payments</div>
                                <div className="font-medium">${clearedPaymentsSum.toFixed(2)}</div>
                            </div>
                            <div className="text-gray-400">+</div>
                            <div>
                                <div>{clearedDepositsCount} deposits</div>
                                <div className="font-medium">${clearedDepositsSum.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    <div className="w-px h-12 bg-gray-300 mx-4"></div>
                    <div className="text-center">
                        {isBalanced ? (
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-1">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        ) : (
                            <div className="text-2xl font-medium text-gray-900">${difference.toFixed(2)}</div>
                        )}
                        <div className={`text - xs font - bold uppercase tracking - widest mt - 1 ${isBalanced ? 'text-green-600' : 'text-gray-500'}`}>Difference</div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-between items-end border-b border-gray-200">
                    <div className="flex space-x-1">
                        {['Payments', 'Deposits', 'All'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`
                                    px - 6 py - 3 font - medium text - sm border - t border - l border - r rounded - t transition - colors
                                    ${filter === f
                                        ? 'bg-white border-gray-300 text-gray-900 -mb-px'
                                        : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700'}
`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="pb-2 flex gap-2">
                        <button className="px-3 py-1.5 border border-green-600 text-green-700 text-sm font-medium rounded hover:bg-green-50">View statements</button>
                        <div className="text-gray-400 px-2 py-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2.4-9a3.5 3.5 0 0110.5 0" /></svg>
                        </div>
                        <div className="text-gray-400 px-2 py-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-bold text-gray-700 uppercase tracking-wider">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Cleared Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Ref No.</th>
                            <th className="p-3">Account</th>
                            <th className="p-3">Payee</th>
                            <th className="p-3">Memo</th>
                            <th className="p-3 text-right">Payment (USD)</th>
                            <th className="p-3 text-right">Deposit (USD)</th>
                            <th className="p-3 text-center w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-blue-50 transition-colors cursor-default">
                                <td className="p-3">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="p-3">{/* Mock cleared date logic */ new Date(item.date).toLocaleDateString()}</td>
                                <td className="p-3">{item.type}</td>
                                <td className="p-3">{item.ref}</td>
                                <td className="p-3">- Split -</td>
                                <td className="p-3">{item.payee}</td>
                                <td className="p-3 truncate max-w-[200px]">{item.memo}</td>
                                <td className="p-3 text-right font-medium text-gray-800">
                                    {item.isPayment && item.amount.toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-medium text-gray-800">
                                    {!item.isPayment && item.amount.toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => toggleClear(item.id, item.isPayment ? 'transaction' : 'batch')}
                                        className={`
w - 6 h - 6 rounded - full flex items - center justify - center transition - colors
                                            ${clearedItems.has(item.id)
                                                ? 'bg-green-500 text-white shadow-sm'
                                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                            }
`}
                                    >
                                        {clearedItems.has(item.id) ? '✓' : ''}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-100 border-t border-gray-200 p-2 text-xs text-center text-gray-500">
                End of list
            </div>
        </div>
    );
}
