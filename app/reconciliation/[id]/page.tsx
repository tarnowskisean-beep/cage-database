
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReconciliationDetail({ params }: { params: Promise<{ id: string }> }) {
    const [periodId, setPeriodId] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        params.then(p => setPeriodId(p.id));
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
        // In a real app, we'd fetch specific items. For now, we mock or fetch broad data.
        // We'll assume the API returns structure: { period: {...}, moneyIn: [...], moneyOut: [...] }
        fetch(`/api/reconciliation/periods/${periodId}`)
            .then(res => res.json())
            .then(data => {
                setPeriod(data.period);
                setMoneyIn(data.moneyIn || []); // Batches
                setMoneyOut(data.moneyOut || []); // Bank Txns / Fees

                // Initialize state
                setStatementEndingBalance(data.period.StatementEndingBalance || '');
                setStatementLink(data.period.StatementLink || '');

                // Initialize cleared items if saved (mock logic)
                // const initialCleared = new Set([...data.moneyIn, ...data.moneyOut].map(i => i.id));
                // setClearedItems(initialCleared);
            })
            .catch(console.error)
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
    const toggleClear = (id: string) => {
        const next = new Set(clearedItems);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setClearedItems(next);
    };

    // Calculations
    const totalDeposits = moneyIn.filter(i => clearedItems.has(i.BatchID)).reduce((sum, i) => sum + Number(i.AmountDonorNet || 0), 0);
    const totalWithdrawals = moneyOut.filter(i => clearedItems.has(i.BankTransactionID)).reduce((sum, i) => sum + Number(i.AmountOut || 0), 0);

    // Begin Balance would come from DB (Previous Period End)
    const beginBalance = 0;
    const clearedBalance = beginBalance + totalDeposits - totalWithdrawals;
    const targetBalance = parseFloat(statementEndingBalance) || 0;
    const difference = targetBalance - clearedBalance;
    const isBalanced = Math.abs(difference) < 0.01;

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


    if (loading) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-gray-500 animate-pulse font-mono">LOADING SECURE LEDGER...</div>;
    if (!period) return <div className="min-h-screen bg-[#111] flex items-center justify-center text-red-500 font-mono">PERIOD NOT FOUND</div>;

    return (
        <div className="min-h-screen bg-[#111] text-white flex flex-col">

            {/* HUD / Sticky Header */}
            <header className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-2xl">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-6">

                        {/* Period Info */}
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Link href="/reconciliation" className="text-gray-500 hover:text-white transition-colors">&larr;</Link>
                                <h1 className="text-xl font-bold font-display text-white">{period.ClientName}</h1>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800 uppercase tracking-widest">{period.Status}</span>
                            </div>
                            <p className="text-sm text-gray-400 font-mono">
                                {new Date(period.PeriodStartDate).toLocaleDateString()} — {new Date(period.PeriodEndDate).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Interactive Balancer */}
                        <div className="flex bg-black/40 rounded-lg p-2 border border-[var(--color-border)] items-center gap-6">

                            <div className="flex items-center gap-3 px-2">
                                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Statement Balance</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={statementEndingBalance}
                                        onChange={e => setStatementEndingBalance(e.target.value)}
                                        onBlur={handleSaveDraft}
                                        className="bg-[#222] border border-gray-700 rounded w-32 py-1.5 pl-6 pr-2 text-right font-mono text-white text-sm focus:border-[var(--color-accent)] outline-none transition-colors"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-700"></div>

                            <div className="flex items-center gap-8 px-2">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 text-right">Cleared Balance</p>
                                    <p className="text-sm font-mono text-gray-300 text-right">${clearedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 text-right">Beginning</p>
                                    <p className="text-sm font-mono text-gray-500 text-right">${beginBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Difference</p>
                                    <p className={`text-xl font-mono font-bold ${isBalanced ? 'text-green-500' : 'text-red-500'}`}>
                                        ${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced || submitting || period.Status !== 'Open'}
                                className={`
                                    px-6 py-2 rounded font-bold uppercase tracking-wider text-xs transition-all shadow-lg
                                    ${isBalanced && period.Status === 'Open'
                                        ? 'bg-[var(--color-accent)] text-black hover:bg-white hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(192,160,98,0.3)]'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed grayscale'
                                    }
                                `}
                            >
                                {submitting ? 'Finishing...' : 'Finish Now'}
                            </button>
                        </div>
                    </div>

                    {/* Link Input Row */}
                    <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 w-full max-w-xl">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            <input
                                type="text"
                                value={statementLink}
                                onChange={e => setStatementLink(e.target.value)}
                                onBlur={handleSaveDraft}
                                className="bg-transparent border-none text-blue-400 placeholder-gray-600 w-full focus:outline-none hover:underline"
                                placeholder="Paste Google Drive Link to Bank Statement PDF..."
                            />
                        </div>
                        <div className="flex gap-4 text-gray-600">
                            <span>Payments: {moneyIn.length} ({moneyIn.filter(i => clearedItems.has(i.BatchID)).length} cleared)</span>
                            <span>•</span>
                            <span>Withdrawals: {moneyOut.length} ({moneyOut.filter(i => clearedItems.has(i.BankTransactionID)).length} cleared)</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Split Interface */}
            <main className="flex-1 max-w-[1800px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Money In */}
                <div className="glass-panel flex flex-col h-[calc(100vh-250px)]">
                    <div className="p-4 border-b border-[var(--color-border)] bg-[#1f1f1f] flex justify-between items-center sticky top-0">
                        <h3 className="font-display text-lg text-white">Checks & Payments (Money In)</h3>
                        <span className="text-green-500 font-mono text-sm">+{totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {moneyIn.map((item) => (
                            <div
                                key={item.BatchID}
                                onClick={() => toggleClear(item.BatchID)}
                                className={`
                                    flex items-center justify-between p-3 rounded border cursor-pointer transition-all select-none
                                    ${clearedItems.has(item.BatchID)
                                        ? 'bg-blue-900/10 border-blue-500/30'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                         w-4 h-4 rounded border flex items-center justify-center transition-colors
                                         ${clearedItems.has(item.BatchID) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}
                                     `}>
                                        {clearedItems.has(item.BatchID) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-200">Batch #{item.BatchID}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(item.DepositDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="font-mono text-sm text-green-400">${Number(item.AmountDonorNet).toFixed(2)}</p>
                            </div>
                        ))}
                        {moneyIn.length === 0 && <div className="p-8 text-center text-gray-600 italic">No deposits found for this period.</div>}
                    </div>
                </div>

                {/* Money Out */}
                <div className="glass-panel flex flex-col h-[calc(100vh-250px)]">
                    <div className="p-4 border-b border-[var(--color-border)] bg-[#1f1f1f] flex justify-between items-center sticky top-0">
                        <h3 className="font-display text-lg text-white">Withdrawals & Expenses (Money Out)</h3>
                        <span className="text-red-500 font-mono text-sm">-{totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {moneyOut.map((item) => (
                            <div
                                key={item.BankTransactionID}
                                onClick={() => toggleClear(item.BankTransactionID)}
                                className={`
                                    flex items-center justify-between p-3 rounded border cursor-pointer transition-all select-none
                                    ${clearedItems.has(item.BankTransactionID)
                                        ? 'bg-blue-900/10 border-blue-500/30'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                         w-4 h-4 rounded border flex items-center justify-center transition-colors
                                         ${clearedItems.has(item.BankTransactionID) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}
                                     `}>
                                        {clearedItems.has(item.BankTransactionID) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-200">{item.Description || 'Bank Transaction'}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(item.TransactionDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="font-mono text-sm text-red-400">-${Number(item.AmountOut).toFixed(2)}</p>
                            </div>
                        ))}
                        {moneyOut.length === 0 && <div className="p-8 text-center text-gray-600 italic">No withdrawals found for this period.</div>}
                    </div>
                </div>

            </main>
        </div>
    );
}
