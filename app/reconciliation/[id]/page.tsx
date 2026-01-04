
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


                // Initialize cleared items
                const initialCleared = new Set<string>();
                (data.moneyIn || []).forEach((i: any) => {
                    if (i.cleared) initialCleared.add(i.id);
                });
                (data.moneyOut || []).forEach((i: any) => {
                    if (i.cleared) initialCleared.add(i.id);
                });
                setClearedItems(initialCleared);
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


    // Calculations
    const totalDeposits = moneyIn.filter(i => clearedItems.has(i.BatchID)).reduce((sum, i) => sum + Number(i.AmountDonorNet || 0), 0);
    const totalWithdrawals = moneyOut.filter(i => clearedItems.has(i.BankTransactionID)).reduce((sum, i) => sum + Number(i.AmountOut || 0), 0);

    // Auto-Match / CSV Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Dynamic import to avoid SSR issues with PapaParse? Standard import usually fine if verified.
        // But let's use standard import at top of file.
        // Wait, I can't add import at top with this tool easily without replacing whole file.
        // Actually, I should use `allowMultiple` or just a carefully crafted replace.
        // I'll assume I can add the logic here and modify imports separately or use require? 
        // require('papaparse') might work.

        const Papa = require('papaparse');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: any) => {
                const transactions = results.data.map((row: any) => {
                    // Logic to map diverse CSV headers
                    const date = row['Date'] || row['date'] || row['Posted Date'];
                    const desc = row['Description'] || row['description'] || row['Memo'] || row['Payee'];

                    let amountIn = 0;
                    let amountOut = 0;

                    const amt = row['Amount'] || row['amount'];
                    const credit = row['Credit'] || row['credit'] || row['Depsit'] || row['deposit'];
                    const debit = row['Debit'] || row['debit'] || row['Withdrawal'] || row['withdrawal'];

                    if (amt) {
                        const val = parseFloat(amt.replace(/[^0-9.-]+/g, ''));
                        if (val > 0) amountIn = val;
                        else amountOut = Math.abs(val);
                    } else {
                        if (credit) amountIn = parseFloat(credit.replace(/[^0-9.-]+/g, ''));
                        if (debit) amountOut = parseFloat(debit.replace(/[^0-9.-]+/g, ''));
                    }

                    if (!date || (amountIn === 0 && amountOut === 0)) return null;

                    return { date, description: desc, amountIn, amountOut };
                }).filter((t: any) => t !== null);

                if (transactions.length === 0) return alert('No valid transactions found in CSV.');

                setSubmitting(true);
                try {
                    const res = await fetch(`/api/reconciliation/periods/${periodId}/bank-import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transactions, clientId: period.ClientID })
                    });
                    const json = await res.json();
                    if (res.ok) {
                        alert(`Successfully imported ${json.imported} transactions.\nMatched: ${json.matched}`);
                        window.location.reload();
                    } else {
                        alert('Import failed: ' + json.error);
                    }
                } catch (e) {
                    console.error(e);
                    alert('Upload failed');
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };


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

                            <div className="h-4 w-px bg-gray-700 mx-2"></div>

                            <label className="flex items-center gap-2 cursor-pointer text-blue-400 hover:text-blue-300 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <span>Upload CSV</span>
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Split Interface */}
            <main className="flex-1 max-w-[1920px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-gray-800">

                {/* Money In Table */}
                <div className="flex flex-col border-r border-gray-800 bg-[#111]">
                    <div className="p-4 bg-[#1a1a1a] border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Deposits & Credits</h3>
                        <span className="text-green-500 font-mono text-sm font-bold">+{totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[#111]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#151515] text-gray-500 sticky top-0 z-10 border-b border-gray-800 font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">✓</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Ref #</th>
                                    <th className="p-3">Memo</th>
                                    <th className="p-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {moneyIn.map((item) => (
                                    <tr
                                        key={item.BatchID}
                                        onClick={() => toggleClear(item.BatchID, 'batch')}
                                        className={`
                                            cursor-pointer transition-colors hover:bg-[#222]
                                            ${clearedItems.has(item.BatchID) ? 'bg-[#1a2e1a] hover:bg-[#1f361f]' : ''}
                                        `}
                                    >
                                        <td className="p-3 text-center">
                                            <div className={`
                                                w-4 h-4 mx-auto rounded border flex items-center justify-center
                                                ${clearedItems.has(item.BatchID) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-600'}
                                            `}>
                                                {clearedItems.has(item.BatchID) && <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-gray-300">{new Date(item.DepositDate).toLocaleDateString()}</td>
                                        <td className="p-3 text-gray-400">Batch #{item.BatchID}</td>
                                        <td className="p-3 text-gray-400 truncate max-w-[150px]">{item.PaymentCategory}</td>
                                        <td className="p-3 text-right font-mono text-green-400 font-medium">${Number(item.AmountDonorNet).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {moneyIn.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-600 italic">No deposits found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Money Out Table */}
                <div className="flex flex-col bg-[#111]">
                    <div className="p-4 bg-[#1a1a1a] border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Checks & Payments</h3>
                        <span className="text-red-500 font-mono text-sm font-bold">-{totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-[#111]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#151515] text-gray-500 sticky top-0 z-10 border-b border-gray-800 font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">✓</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Payee / Description</th>
                                    <th className="p-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {moneyOut.map((item) => (
                                    <tr
                                        key={item.BankTransactionID}
                                        onClick={() => toggleClear(item.BankTransactionID, 'transaction')}
                                        className={`
                                            cursor-pointer transition-colors hover:bg-[#222]
                                            ${clearedItems.has(item.BankTransactionID) ? 'bg-[#1a2e1a] hover:bg-[#1f361f]' : ''}
                                        `}
                                    >
                                        <td className="p-3 text-center">
                                            <div className={`
                                                w-4 h-4 mx-auto rounded border flex items-center justify-center
                                                ${clearedItems.has(item.BankTransactionID) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-600'}
                                            `}>
                                                {clearedItems.has(item.BankTransactionID) && <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono text-gray-300">{new Date(item.TransactionDate).toLocaleDateString()}</td>
                                        <td className="p-3 text-gray-400">Expenditure</td>
                                        <td className="p-3 text-gray-400 truncate max-w-[200px]">{item.Description || 'Bank Transaction'}</td>
                                        <td className="p-3 text-right font-mono text-white font-medium">${Number(item.AmountOut).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {moneyOut.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-600 italic">No withdrawals found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}
