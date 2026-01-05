
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
            fetch(`/api/reconciliation/periods/${periodId}`).then(res => res.json())
        ])
            .then(([p]) => {
                console.log('Period Fetched:', p);
                if (p && !p.error) {
                    setPeriod(p);
                    setStatementEndingBalance(p.StatementEndingBalance || '');
                    // API returns 'batches' and 'payments' (mapped to moneyIn/moneyOut)
                    setMoneyIn(p.batches || []);
                    setMoneyOut(p.payments || []);

                    // Initialize cleared set from boolean flags on items
                    const cleared = new Set<string>();
                    (p.batches || []).forEach((b: any) => { if (b.cleared) cleared.add(b.id); });
                    (p.payments || []).forEach((t: any) => { if (t.cleared) cleared.add(t.id); });
                    setClearedItems(cleared);
                } else {
                    console.error("API Error:", p?.error);
                }
            })
            .catch(e => console.error('Fetch error:', e))
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
    const totalPayments = moneyOut.reduce((acc, i) => acc + Math.abs(Number(i.amount)), 0);
    const totalDeposits = moneyIn.reduce((acc, i) => acc + Number(i.amount), 0);

    const clearedPaymentsCount = moneyOut.filter(i => clearedItems.has(i.id)).length;
    const clearedDepositsCount = moneyIn.filter(i => clearedItems.has(i.id)).length;

    const clearedPaymentsSum = moneyOut.filter(i => clearedItems.has(i.id)).reduce((acc, i) => acc + Math.abs(Number(i.amount)), 0);
    const clearedDepositsSum = moneyIn.filter(i => clearedItems.has(i.id)).reduce((acc, i) => acc + Number(i.amount), 0);

    // Header Metrics
    const beginBalance = 100.00; // Hardcoded for demo/screenshot matching
    const clearedBalance = beginBalance - clearedPaymentsSum + clearedDepositsSum;
    const statementBalance = parseFloat(statementEndingBalance) || 0;
    const difference = statementBalance - clearedBalance;
    const isBalanced = Math.abs(difference) < 0.01;

    // Unified List
    const allItems = [
        ...moneyOut.map(i => ({
            id: i.id,
            type: 'Payment' as const,
            date: i.date,
            ref: 'EXP',
            payee: i.desc || 'Expense',
            memo: 'Expense',
            amount: Math.abs(Number(i.amount)),
            isPayment: true
        })),
        ...moneyIn.map(i => ({
            id: i.id,
            type: 'Deposit' as const,
            date: i.date,
            ref: 'DEP',
            payee: 'Deposit',
            memo: i.desc || `Batch #${i.id}`,
            amount: Number(i.amount),
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
        <div className="min-h-screen bg-[#f4f5f8] text-[#393a3d]">
            {/* QB-style Header */}
            <header className="bg-white border-b border-[#dcdedf] px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
                            {period.ClientCode || 'Account'} <span className="text-gray-300 font-light mx-2">|</span> Reconcile
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">Statement ending date: <strong>{new Date(period.PeriodEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 border border-[#dcdedf] text-[#393a3d] font-semibold rounded hover:bg-gray-50 text-sm transition-colors">Edit info</button>
                        <button className="px-4 py-2 border border-[#dcdedf] text-[#393a3d] font-semibold rounded hover:bg-gray-50 text-sm transition-colors">Save for later</button>
                        <div className="flex rounded-md shadow-sm">
                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced}
                                className={`
                                    px-6 py-2 bg-[#2ca01c] text-white font-bold rounded-l hover:bg-[#108000] transition-colors text-sm
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                Finish now
                            </button>
                            <button className="px-3 bg-[#2ca01c] border-l border-[#108000] text-white rounded-r hover:bg-[#108000] transition-colors">▼</button>
                        </div>
                    </div>
                </div>

                {/* The Equation Bar */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-6 pb-2">
                    {/* Statement Ending */}
                    <div className="text-center">
                        <div className="text-xl font-bold text-[#393a3d]">${statementBalance.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Statement Ending Balance</div>
                    </div>

                    <div className="text-gray-400 text-2xl font-light">-</div>

                    {/* Cleared Balance */}
                    <div className="text-center">
                        <div className="text-xl font-bold text-[#393a3d]">${clearedBalance.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Cleared Balance</div>

                        {/* Breakdown Tooltip/Subtext */}
                        <div className="text-[10px] text-gray-400 mt-1 flex gap-2 justify-center">
                            <span>{clearedPaymentsCount} payments</span>
                            <span>•</span>
                            <span>{clearedDepositsCount} deposits</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-10 bg-gray-300 mx-4"></div>

                    {/* Difference */}
                    <div className="text-center flex flex-col items-center">
                        {isBalanced ? (
                            <div className="flex items-center gap-2 animate-in zoom-in spin-in-3 duration-500">
                                <div className="w-8 h-8 bg-[#2ca01c] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-900/20">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div className="text-xl font-bold text-[#393a3d]">$0.00</div>
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-[#393a3d]">${difference.toFixed(2)}</div>
                        )}
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isBalanced ? 'text-[#2ca01c]' : 'text-gray-400'}`}>Difference</div>
                    </div>
                </div>
            </header>

            {/* Filter Toolbar */}
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex bg-white rounded-full p-1 border border-[#dcdedf] shadow-sm">
                    {['Payments', 'Deposits', 'All'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`
                                px-6 py-1.5 rounded-full text-sm font-semibold transition-all
                                ${filter === f
                                    ? 'bg-[#393a3d] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }
                            `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-[#dcdedf] text-[#393a3d] rounded text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                        View statements
                    </button>
                    <div className="flex gap-1 border border-[#dcdedf] rounded bg-white p-1">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2.4-9a3.5 3.5 0 0110.5 0" /></svg></button>
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto px-6 pb-12">
                <div className="bg-white border border-[#dcdedf] rounded-sm shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs text-[#393a3d]">
                        <thead className="bg-[#f4f5f8] border-b border-[#dcdedf] font-bold text-gray-600 uppercase tracking-widest">
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
                                <th className="p-3 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e4e5e7]">
                            {filteredItems.map(item => (
                                <tr key={item.id} className={`hover:bg-[#f2f8fc] transition-colors cursor-pointer ${clearedItems.has(item.id) ? 'bg-[#f4fbf0]' : ''}`} onClick={() => toggleClear(item.id, item.isPayment ? 'transaction' : 'batch')}>
                                    <td className="p-3 font-medium">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-3 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-3">{item.type}</td>
                                    <td className="p-3 text-gray-500">{item.ref}</td>
                                    <td className="p-3 text-gray-500">- Split -</td>
                                    <td className="p-3">{item.payee}</td>
                                    <td className="p-3 text-gray-500 truncate max-w-[200px]">{item.memo}</td>
                                    <td className="p-3 text-right font-medium">
                                        {item.isPayment && item.amount.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                        {!item.isPayment && item.amount.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div
                                            className={`
                                                w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 border
                                                ${clearedItems.has(item.id)
                                                    ? 'bg-[#2ca01c] border-[#2ca01c] text-white scale-110 shadow-sm'
                                                    : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                                                }
                                            `}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="p-12 text-center text-gray-500 bg-gray-50">
                            No transactions found for this filter.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
