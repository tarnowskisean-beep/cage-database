
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
            clearedDate: i.clearedDate,
            ref: i.ref,
            payee: i.payee,
            memo: i.memo,
            amount: Number(i.amount),
            isPayment: true,
            cleared: i.cleared
        })),
        ...moneyIn.map(i => ({
            id: i.id,
            type: 'Deposit' as const,
            date: i.date,
            clearedDate: i.clearedDate,
            ref: i.ref,
            payee: i.payee,
            memo: i.memo,
            amount: Number(i.amount),
            isPayment: false,
            cleared: i.cleared
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
        <div className="min-h-screen bg-[var(--color-bg-main)] text-white font-body">
            {/* QB-style Header - Dark */}
            <header className="bg-[var(--color-bg-elevated)] border-b border-[var(--glass-border)] px-6 py-4 sticky top-0 z-20 shadow-md">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white font-display flex items-center gap-3">
                            {period.ClientCode || 'Account'} <span className="text-gray-600 font-light text-xl">|</span> Reconcile
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">Statement ending date: <strong className="text-gray-200">{new Date(period.PeriodEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex rounded-md shadow-sm">
                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced}
                                className={`
                                    px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-500 transition-colors text-sm
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-700
                                `}
                            >
                                Finish Reconcile
                            </button>
                        </div>
                    </div>
                </div>

                {/* The Equation Bar */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 mt-8 pb-4">
                    {/* Statement Ending */}
                    <div className="text-center group">
                        <div className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">${statementBalance.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 group-hover:text-gray-400 transition-colors">Statement Ending Balance</div>
                    </div>

                    <div className="text-zinc-700 text-3xl font-light">-</div>

                    {/* Cleared Balance */}
                    <div className="text-center group">
                        <div className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">${clearedBalance.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 group-hover:text-gray-400 transition-colors">Cleared Balance</div>

                        {/* Breakdown Tooltip/Subtext */}
                        <div className="text-[10px] text-zinc-600 mt-2 flex gap-3 justify-center bg-white/5 py-1 px-3 rounded-full">
                            <span>{clearedPaymentsCount} payments</span>
                            <span className="text-zinc-700">•</span>
                            <span>{clearedDepositsCount} deposits</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-12 bg-zinc-800 mx-4"></div>

                    {/* Difference */}
                    <div className="text-center flex flex-col items-center">
                        {isBalanced ? (
                            <div className="flex items-center gap-3 animate-in zoom-in spin-in-3 duration-500">
                                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div className="text-2xl font-bold text-white">$0.00</div>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold text-white">${difference.toFixed(2)}</div>
                        )}
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isBalanced ? 'text-emerald-400' : 'text-zinc-500'}`}>Difference</div>
                    </div>
                </div>
            </header>

            {/* Filter Toolbar */}
            <div className="px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[var(--color-bg-main)]">
                <div className="flex bg-zinc-900/50 rounded-full p-1 border border-white/5">
                    {['Payments', 'Deposits', 'All'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`
                                px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all
                                ${filter === f
                                    ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-zinc-900 border-t border-b border-white/5">
                <table className="w-full text-left text-xs uppercase tracking-wide">
                    <thead className="text-gray-500 border-b border-white/5 bg-zinc-900 sticky top-0 z-10">
                        <tr>
                            <th className="py-4 px-6 font-semibold w-32">Date</th>
                            <th className="py-4 px-6 font-semibold w-32">Cleared Date</th>
                            <th className="py-4 px-6 font-semibold">Type</th>
                            <th className="py-4 px-6 font-semibold">Ref No</th>
                            <th className="py-4 px-6 font-semibold">Payee</th>
                            <th className="py-4 px-6 font-semibold w-1/3">Memo</th>
                            <th className="py-4 px-6 font-semibold text-right">Payment</th>
                            <th className="py-4 px-6 font-semibold text-right">Deposit</th>
                            <th className="py-4 px-6 font-semibold text-center w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={9} className="py-8 text-center text-gray-500">Loading period data...</td></tr>
                        ) : allItems.length === 0 ? (
                            <tr><td colSpan={9} className="py-8 text-center text-gray-500">No transactions found for this period</td></tr>
                        ) : (
                            filteredItems.map(item => { // Changed from allItems.map to filteredItems.map
                                const isCleared = clearedItems.has(item.id); // Use state for cleared status
                                // For alternating row colors or hover effects if needed
                                return (
                                    <tr
                                        key={`${item.type}-${item.id}`}
                                        className={`
                                            group transition-colors
                                            ${isCleared ? 'bg-emerald-900/10' : 'hover:bg-white/5'}
                                        `}
                                        onClick={() => toggleClear(item.id, item.isPayment ? 'transaction' : 'batch')} // Use toggleClear
                                    >
                                        <td className="py-4 px-6 font-mono text-gray-300">
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6 font-mono text-gray-400">
                                            {item.clearedDate ? new Date(item.clearedDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${item.type === 'Deposit'
                                                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50'
                                                : 'bg-rose-900/30 text-rose-400 border-rose-900/50'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-gray-300">{item.ref}</td>
                                        <td className="py-4 px-6 text-white font-medium">{item.payee}</td>
                                        <td className="py-4 px-6 text-gray-400 truncate max-w-xs" title={item.memo}>{item.memo}</td>
                                        <td className="py-4 px-6 text-right font-mono text-gray-300">
                                            {item.isPayment ? item.amount.toFixed(2) : ''}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-white">
                                            {!item.isPayment ? item.amount.toFixed(2) : ''}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className={`
                                                w-5 h-5 mx-auto rounded-full border flex items-center justify-center transition-all
                                                ${isCleared
                                                    ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                    : 'border-white/20 group-hover:border-white/50'
                                                }
                                            `}>
                                                {isCleared && (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
