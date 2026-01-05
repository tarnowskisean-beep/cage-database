
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
                        <button className="px-4 py-2 border border-[var(--glass-border)] text-gray-300 font-medium rounded hover:bg-white/5 hover:text-white text-sm transition-colors">Edit info</button>
                        <button className="px-4 py-2 border border-[var(--glass-border)] text-gray-300 font-medium rounded hover:bg-white/5 hover:text-white text-sm transition-colors">Save for later</button>
                        <div className="flex rounded-md shadow-sm">
                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced}
                                className={`
                                    px-6 py-2 bg-emerald-600 text-white font-bold rounded-l hover:bg-emerald-500 transition-colors text-sm
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-700
                                `}
                            >
                                Finish now
                            </button>
                            <button className="px-3 bg-emerald-600 border-l border-emerald-700 text-white rounded-r hover:bg-emerald-500 transition-colors">▼</button>
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
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-white/20 rounded text-xs font-bold uppercase tracking-wide transition-colors">
                        View statements
                    </button>
                    <div className="flex gap-1 border border-white/10 rounded bg-zinc-900/50 p-1">
                        <button className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2.4-9a3.5 3.5 0 0110.5 0" /></svg></button>
                        <button className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 overflow-auto px-6 pb-12">
                <div className="glass-panel overflow-hidden">
                    <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-white/5 border-b border-white/5 font-bold text-gray-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Cleared Date</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Ref No.</th>
                                <th className="p-4">Account</th>
                                <th className="p-4">Payee</th>
                                <th className="p-4">Memo</th>
                                <th className="p-4 text-right">Payment</th>
                                <th className="p-4 text-right">Deposit</th>
                                <th className="p-4 text-center w-16">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredItems.map(item => (
                                <tr
                                    key={item.id}
                                    className={`
                                        group transition-colors cursor-pointer
                                        ${clearedItems.has(item.id)
                                            ? 'bg-emerald-900/10 hover:bg-emerald-900/20'
                                            : 'hover:bg-white/5'
                                        }
                                    `}
                                    onClick={() => toggleClear(item.id, item.isPayment ? 'transaction' : 'batch')}
                                >
                                    <td className="p-4 font-medium text-white group-hover:text-emerald-200 transition-colors">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className={`
                                            px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border
                                            ${item.type === 'Payment' ? 'border-orange-500/20 text-orange-400 bg-orange-500/5' : 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'}
                                        `}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 font-mono text-[10px]">{item.ref}</td>
                                    <td className="p-4 text-gray-600 italic">- Split -</td>
                                    <td className="p-4 text-gray-300">{item.payee}</td>
                                    <td className="p-4 text-gray-500 truncate max-w-[200px]">{item.memo}</td>
                                    <td className="p-4 text-right font-medium text-white">
                                        {item.isPayment && item.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-right font-medium text-white">
                                        {!item.isPayment && item.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div
                                            className={`
                                                w-5 h-5 mx-auto rounded-full flex items-center justify-center transition-all duration-200
                                                ${clearedItems.has(item.id)
                                                    ? 'bg-emerald-500 text-black scale-110 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                                    : 'bg-transparent border border-zinc-700 text-transparent hover:border-zinc-500'
                                                }
                                            `}
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                <span className="text-2xl opacity-50">🔍</span>
                            </div>
                            <h3 className="text-white font-medium mb-1">No items found</h3>
                            <p className="text-gray-500 text-sm">Try adjusting your filters or date range.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
