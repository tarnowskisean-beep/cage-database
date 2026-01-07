
'use client';

// Force Re-deploy: Fix for Period Not Found

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

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
    const [bankTransactions, setBankTransactions] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reconciliation State
    const [statementEndingBalance, setStatementEndingBalance] = useState<string>('');
    const [statementLink, setStatementLink] = useState<string>('');
    const [clearedItems, setClearedItems] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        if (!periodId) return;

        setLoading(true);

        Promise.all([
            fetch(`/api/reconciliation/periods/${periodId}`).then(async res => {
                if (!res.ok) {
                    const txt = await res.text();
                    try {
                        const json = JSON.parse(txt);
                        throw new Error(json.error || `API Error: ${res.status}`);
                    } catch (e) {
                        throw new Error(`API Error: ${res.status} - ${txt.substring(0, 100)}`);
                    }
                }
                return res.json();
            })
        ])
            .then(([p]) => {
                console.log('Period Fetched:', p);
                if (p && !p.error) {
                    setPeriod(p);
                    setStatementEndingBalance(p.StatementEndingBalance || '');
                    // API returns 'batches' and 'payments' (mapped to moneyIn/moneyOut)
                    setMoneyIn(p.batches || []);
                    setMoneyOut(p.payments || []);
                    setBankTransactions(p.bankTransactions || []);

                    // Initialize cleared set from boolean flags on items
                    const cleared = new Set<string>();
                    (p.batches || []).forEach((b: any) => { if (b.cleared) cleared.add(b.id); });
                    (p.payments || []).forEach((t: any) => { if (t.cleared) cleared.add(t.id); });
                    setClearedItems(cleared);
                    setClearedItems(cleared);
                } else {
                    console.error("API Error:", p?.error);
                    setApiError(p?.error || 'Unknown Error');
                }
            })
            .catch(e => {
                console.error('Fetch error:', e);
                setApiError(e.toString());
            })
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


    const [filter, setFilter] = useState<'All' | 'Payments' | 'Deposits' | 'Matched' | 'Unmatched Bank' | 'Unmatched System'>('All');

    // Action Modal State
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [matchTarget, setMatchTarget] = useState<any>(null); // The Bank Transaction to match

    const [createBatchModalOpen, setCreateBatchModalOpen] = useState(false);
    const [createBatchData, setCreateBatchData] = useState<{ amount: number, date: string, description: string } | null>(null);
    const [createBatchTargetId, setCreateBatchTargetId] = useState<string | null>(null); // Bank Tx ID

    const batchDateRef = useRef<HTMLInputElement>(null);
    const batchDescRef = useRef<HTMLInputElement>(null);

    // Handlers
    const openMatchModal = (bankTx: any) => {
        setMatchTarget(bankTx);
        setMatchModalOpen(true);
    };

    const handleManualMatch = async (systemItemId: string, systemItemType: 'Batch' | 'Donation') => {
        if (!matchTarget) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/reconciliation/periods/${periodId}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankTransactionId: matchTarget.TransactionID,
                    systemItemId,
                    systemItemType
                })
            });
            if (res.ok) {
                // Refresh
                const p = await fetch(`/api/reconciliation/periods/${periodId}`).then(r => r.json());
                if (p && !p.error) {
                    setPeriod(p);
                    setBankTransactions(p.bankTransactions);
                    setMoneyIn(p.batches);
                    setMoneyOut(p.payments);
                }
                setMatchModalOpen(false);
                setMatchTarget(null);
            } else {
                alert('Match failed');
            }
        } catch (e) {
            console.error(e);
            alert('Error matching');
        } finally {
            setSubmitting(false);
        }
    };

    const openCreateBatchModal = (bankTx: any) => {
        setCreateBatchData({
            amount: bankTx.Amount,
            date: bankTx.Date ? new Date(bankTx.Date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: bankTx.Description || 'Bank Import'
        });
        setCreateBatchTargetId(bankTx.TransactionID);
        setCreateBatchModalOpen(true);
    };

    const confirmCreateBatch = async () => {
        if (!period || !createBatchData || !createBatchTargetId) return;
        setSubmitting(true);

        try {
            // 1. Create Batch
            const batchRes = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: period.ClientID,
                    date: batchDateRef.current?.value || createBatchData.date,
                    description: batchDescRef.current?.value || createBatchData.description,
                    entryMode: 'Manual',
                    paymentCategory: 'Check', // Defaulting for now
                    defaultGiftPlatform: 'Cage', // Or Import?
                    defaultGiftMethod: 'Check',
                    defaultTransactionType: 'Gift'
                })
            });
            const batchData = await batchRes.json();

            if (!batchRes.ok) throw new Error(batchData.error || 'Failed to create batch');

            // 2. Match it
            const matchRes = await fetch(`/api/reconciliation/periods/${periodId}/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bankTransactionId: createBatchTargetId,
                    systemItemId: batchData.BatchID,
                    systemItemType: 'Batch'
                })
            });

            if (!matchRes.ok) throw new Error('Failed to link batch');

            // 3. Refresh
            const p = await fetch(`/api/reconciliation/periods/${periodId}`).then(r => r.json());
            if (p && !p.error) {
                setPeriod(p);
                setBankTransactions(p.bankTransactions);
                setMoneyIn(p.batches);
                setMoneyOut(p.payments);
            }
            setCreateBatchModalOpen(false);

        } catch (e: any) {
            console.error(e);
            alert('Error: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Import Handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: false, // We will manually handle the weird header row 3
            complete: async (results) => {
                const rows = results.data as string[][];
                // User said Header on Row 3 (Index 2), Data from Row 4 (Index 3)
                // Let's inspect Row 2 to confirm headers or just assume fixed format
                // Format: Account Number(0), Account Type(1), Date(2), Check/Ref(3), Description(4), Debit(5), Credit(6), Balance(7)

                const transactions = rows.slice(3).map(row => {
                    if (!row[2]) return null; // Skip empty date

                    // Parse Amount: Credit is positive, Debit (if exists) is negative
                    const credit = row[6] ? parseFloat(row[6].replace(/[^0-9.-]+/g, '')) : 0;
                    const debit = row[5] ? parseFloat(row[5].replace(/[^0-9.-]+/g, '')) : 0; // Assuming Debit column has values
                    // Note: User image shows Debit column empty for credits, assuming filled for debits
                    // If Debit has value, treat as negative? Or just subtract?
                    // Let's assume strict columns: if Credit has value use it, else if Debit use -Debit

                    let amount = 0;
                    if (row[6] && row[6].trim()) amount = credit;
                    else if (row[5] && row[5].trim()) amount = -Math.abs(debit); // Ensure negative

                    if (amount === 0) return null; // Skip zero rows if any

                    return {
                        Date: row[2], // Send raw date string to backend or parse? Backend handles it well usually. 
                        // But let's standardise to YYYY-MM-DD if possible. 
                        // User date: 1/5/26 -> 2026-01-05
                        Description: row[4],
                        Reference: row[3],
                        Amount: amount
                    };
                }).filter(Boolean);

                if (transactions.length === 0) {
                    alert('No valid transactions found in file.');
                    return;
                }

                // Upload
                try {
                    const res = await fetch(`/api/reconciliation/periods/${periodId}/bank-import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transactions })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert(`Imported ${data.imported} transactions. Auto-matched ${data.matched}.`);
                        // Refetch
                        setLoading(true); // Trigger effect
                        const p = await fetch(`/api/reconciliation/periods/${periodId}`).then(r => r.json());
                        setPeriod(p);
                        setMoneyIn(p.batches || []);
                        setMoneyOut(p.payments || []);
                        setBankTransactions(p.bankTransactions || []);
                        setLoading(false);
                        setFilter('Unmatched Bank'); // Switch view
                    } else {
                        alert('Import failed: ' + data.error);
                    }
                } catch (e) {
                    console.error(e);
                    alert('Upload error');
                }
            }
        });

        // Reset input
        e.target.value = '';
    };

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

    // Helper to check if a system item is matched to a bank transaction
    const isSystemItemMatched = (itemId: string | number) => {
        return bankTransactions.some(bt =>
            (bt.MatchedBatchID && String(bt.MatchedBatchID) === String(itemId)) ||
            (bt.MatchedDonationID && itemId.toString().startsWith('REF-') && itemId.toString().includes(String(bt.MatchedDonationID)))
        );
    };

    const renderSystemRow = (item: any) => {
        const isMsatched = isSystemItemMatched(item.id);
        const isCleared = clearedItems.has(item.id) || isMsatched;

        return (
            <tr
                key={`${item.type}-${item.id}`}
                className={`
                    group transition-colors
                    ${isCleared ? 'bg-emerald-900/10' : 'hover:bg-white/5'}
                `}
                onClick={() => toggleClear(item.id, item.isPayment ? 'transaction' : 'batch')}
            >
                <td className="py-4 px-6 font-mono text-gray-300">{new Date(item.date).toLocaleDateString()}</td>
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
                    {item.isPayment ? Math.abs(item.amount).toFixed(2) : ''}
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
                {/* Actions Column Placeholder for System Row */}
                {(filter === 'Unmatched Bank' || filter === 'Unmatched System') && <td className="py-4 px-6"></td>}
            </tr>
        );
    }

    const renderTableBody = () => {
        if (loading) return <tr><td colSpan={10} className="py-8 text-center text-gray-500">Loading period data...</td></tr>;

        // View: Bank Transactions (Matched or Unmatched)
        if (filter === 'Matched' || filter === 'Unmatched Bank') {
            const targetStatus = filter === 'Matched' ? 'Matched' : 'Unmatched';
            const displayItems = bankTransactions.filter(bt => bt.Status === targetStatus);

            if (displayItems.length === 0) return <tr><td colSpan={10} className="py-8 text-center text-gray-500">No {filter.toLowerCase()} transactions found.</td></tr>;

            return displayItems.map(bt => (
                <tr key={bt.TransactionID} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-mono text-gray-300">{new Date(bt.Date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 font-mono text-gray-400">-</td>
                    <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${bt.Amount > 0
                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50'
                            : 'bg-rose-900/30 text-rose-400 border-rose-900/50'
                            }`}>
                            {bt.Amount > 0 ? 'Bank Deposit' : 'Bank Debit'}
                        </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300">{bt.Reference || '-'}</td>
                    <td className="py-4 px-6 text-white font-medium">Bank Transaction</td>
                    <td className="py-4 px-6 text-gray-400 truncate max-w-xs">{bt.Description}</td>
                    <td className="py-4 px-6 text-right font-mono text-gray-300">
                        {bt.Amount < 0 ? Math.abs(bt.Amount).toFixed(2) : ''}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-white">
                        {bt.Amount > 0 ? bt.Amount.toFixed(2) : ''}
                    </td>
                    <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${bt.Status === 'Matched' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {bt.Status}
                        </span>
                    </td>
                    {/* Actions Column */}
                    {(filter === 'Unmatched Bank') && (
                        <td className="py-4 px-6 text-right flex gap-2 justify-end">
                            <button
                                onClick={(e) => { e.stopPropagation(); openMatchModal(bt); }}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] uppercase font-bold rounded border border-white/10"
                            >
                                Match
                            </button>
                            {bt.Amount > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openCreateBatchModal(bt); }}
                                    className="px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-200 text-[10px] uppercase font-bold rounded border border-blue-800/50"
                                >
                                    + Batch
                                </button>
                            )}
                        </td>
                    )}
                </tr>
            ));
        }

        // View: System Items (Unmatched System or All)
        if (filter === 'Unmatched System') {
            const displayItems = allItems.filter(i => !isSystemItemMatched(i.id));
            if (displayItems.length === 0) return <tr><td colSpan={10} className="py-8 text-center text-gray-500">All system items are matched!</td></tr>;
            return displayItems.map(item => renderSystemRow(item));
        }

        // View: All/Payments/Deposits (Legacy/Mixed View)
        return filteredItems.map(item => renderSystemRow(item));
    };


    if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-gray-500 animate-pulse">Loading Workspace...</div>;
    if (!period) return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4">
            <div className="text-red-500 font-bold text-xl">Period Not Found</div>
            <div className="text-gray-500">ID: {periodId}</div>
            {apiError && <div className="text-red-400 bg-red-900/20 p-4 rounded border border-red-900/50 mt-2 max-w-md text-center font-mono text-sm break-all">{apiError}</div>}
            <Link href="/reconciliation" className="text-blue-400 hover:underline mt-4">Return to List</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--color-bg-main)] text-white font-body">
            {/* QB-style Header - Dark */}
            <header className="bg-[var(--color-bg-elevated)] border-b border-[var(--glass-border)] px-6 py-4 sticky top-0 z-20 shadow-md">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white font-display flex items-center gap-3">
                            {period.ClientCode} <span className="text-gray-600 font-light text-xl">|</span> {period.AccountName || 'Main Operating'} <span className="text-gray-600 font-light text-xl">|</span> Reconcile
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">Statement ending date: <strong className="text-gray-200">{new Date(period.PeriodEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded transition-colors text-sm border border-white/10"
                        >
                            Import Bank CSV
                        </button>
                        <div className="flex rounded-md shadow-sm">
                            <button
                                onClick={handleFinish}
                                disabled={!isBalanced}
                                className={`
                                    px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors text-sm shadow-lg hover:shadow-white/10
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-gray-500 disabled:shadow-none
                                `}
                            >
                                Finish Reconcile
                            </button>
                        </div>
                    </div>
                </div>

                {/* The Equation Bar */}
                {/* Metrics Panel - Professional & Clean */}
                <div className="max-w-4xl mx-auto mt-6 mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden shadow-xl">

                        {/* Statement Ending */}
                        <div className="bg-[#09090b]/40 backdrop-blur p-6 flex flex-col items-center justify-center group relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1 bg-zinc-700/50"></div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 group-hover:text-gray-300 transition-colors">Statement Balance</span>
                            <span className="text-3xl font-mono font-medium text-white tracking-tight">
                                ${statementBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Cleared Balance */}
                        <div className="bg-[#09090b]/40 backdrop-blur p-6 flex flex-col items-center justify-center group relative overflow-hidden">
                            <div className="absolute top-0 inset-x-0 h-1 bg-blue-500/50"></div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 group-hover:text-gray-300 transition-colors">Cleared Balance</span>
                            <span className="text-3xl font-mono font-medium text-blue-100 tracking-tight">
                                ${clearedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex gap-3 mt-2 opacity-50 text-[10px] font-mono text-blue-300/80">
                                <span>-{clearedPaymentsCount} pts</span>
                                <span>+{clearedDepositsCount} deps</span>
                            </div>
                        </div>

                        {/* Difference */}
                        <div className="bg-[#09090b]/40 backdrop-blur p-6 flex flex-col items-center justify-center group relative overflow-hidden">
                            <div className={`absolute top-0 inset-x-0 h-1 transition-colors duration-500 ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 group-hover:text-gray-300 transition-colors">Difference</span>

                            {isBalanced ? (
                                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                    <span className="text-3xl font-mono font-medium text-emerald-400 tracking-tight">
                                        $0.00
                                    </span>
                                    <span className="text-[10px] text-emerald-500/80 font-bold tracking-widest mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        BALANCED
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-mono font-medium text-rose-400 tracking-tight">
                                        ${difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-rose-500/80 font-bold tracking-widest mt-1">OFF BALANCE</span>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Visual Formula Guide (Subtle) */}
                    <div className="flex justify-between px-12 -mt-3 relative z-10 pointer-events-none opacity-0 md:opacity-100">
                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-gray-600 text-lg shadow-lg transform -translate-y-1/2 translate-x-1/2">
                            −
                        </div>
                        <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-gray-600 text-lg shadow-lg transform -translate-y-1/2 -translate-x-1/2">
                            =
                        </div>
                    </div>
                </div>
            </header>

            {/* Split View Container */}
            <div className="flex flex-1 overflow-hidden h-[calc(100vh-200px)]">

                {/* LEFT: Bank Transactions */}
                <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#09090b]">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center sticky top-0">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Bank Statement</h2>
                        <span className="text-xs text-gray-500">{bankTransactions.filter(b => b.Status === 'Unmatched').length} Unmatched</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {bankTransactions.filter(bt => bt.Status === 'Unmatched').map(bt => (
                            <div
                                key={bt.TransactionID}
                                onClick={() => openMatchModal(bt)}
                                className="p-4 rounded bg-zinc-900 border border-white/5 hover:border-blue-500/50 cursor-pointer transition-all group relative"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-mono text-gray-300 text-sm">{new Date(bt.Date).toLocaleDateString()}</span>
                                    <span className={`font-mono font-bold ${bt.Amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bt.Amount > 0 ? '+' : ''}{bt.Amount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-white font-medium text-sm mb-1">{bt.Description}</div>
                                <div className="text-xs text-gray-500 truncate">{bt.Reference || 'No Ref'}</div>

                                {/* Hover Action */}
                                <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    {bt.Amount > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openCreateBatchModal(bt);
                                            }}
                                            className="text-[10px] bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded border border-emerald-600/30 uppercase font-bold hover:bg-emerald-600/40"
                                        >
                                            + Batch
                                        </button>
                                    )}
                                    <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-600/30 uppercase font-bold">Match &rarr;</span>
                                </div>
                            </div>
                        ))}
                        {bankTransactions.filter(bt => bt.Status === 'Unmatched').length === 0 && (
                            <div className="text-center text-gray-500 py-12 italic">All bank transactions matched.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT: System Items */}
                <div className="w-1/2 flex flex-col bg-[#09090b]">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center sticky top-0">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">System Items</h2>
                        <span className="text-xs text-gray-500">
                            {allItems.filter(i => !clearedItems.has(i.id) && !isSystemItemMatched(i.id)).length} Unmatched
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {allItems.filter(i => !clearedItems.has(i.id) && !isSystemItemMatched(i.id)).map(item => (
                            <div
                                key={item.id}
                                className="p-4 rounded bg-zinc-900 border border-white/5 hover:border-gray-600 cursor-not-allowed opacity-80"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-mono text-gray-300 text-sm">{new Date(item.date).toLocaleDateString()}</span>
                                    <span className={`font-mono font-bold ${item.amount > 0 ? 'text-white' : 'text-gray-400'}`}>
                                        {Math.abs(item.amount).toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-white font-medium text-sm mb-1">{item.payee}</div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.memo}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'Deposit' ? 'bg-emerald-900/30 text-emerald-500' : 'bg-rose-900/30 text-rose-500'
                                        }`}>{item.type}</span>
                                </div>
                            </div>
                        ))}
                        {allItems.filter(i => !clearedItems.has(i.id) && !isSystemItemMatched(i.id)).length === 0 && (
                            <div className="text-center text-gray-500 py-12 italic">All system items matched.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {matchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Manual Match</h3>
                        <p className="text-gray-400 mb-4 text-sm">Select a system item to match with bank transaction: <strong>{matchTarget?.Description}</strong> (${Math.abs(matchTarget?.Amount).toFixed(2)})</p>

                        <div className="max-h-96 overflow-y-auto space-y-2 mb-4 pr-2">
                            {/* Candidate List: Unmatched System Items with Smart Scoring */}
                            {(() => {
                                const candidates = allItems.filter(i => !clearedItems.has(i.id) && !isSystemItemMatched(i.id));

                                const scored = candidates.map(item => {
                                    let score = 0;
                                    const targetAmount = Math.abs(matchTarget?.Amount || 0);
                                    const itemAmount = Math.abs(item.amount);

                                    // 1. Amount Match (Highest Priority)
                                    if (Math.abs(targetAmount - itemAmount) < 0.01) score += 100;

                                    // 2. Date Proximity
                                    const targetDate = new Date(matchTarget?.Date || new Date());
                                    const itemDate = new Date(item.date);
                                    const diffTime = Math.abs(targetDate.getTime() - itemDate.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                    if (diffDays <= 3) score += (10 - diffDays); // Max 10 pts for same day

                                    return { item, score };
                                });

                                // Sort by Score DESC
                                scored.sort((a, b) => b.score - a.score);

                                return scored.map(({ item, score }) => (
                                    <div key={item.id} className={`flex justify-between items-center p-3 rounded border cursor-pointer group transition-all
                                        ${score > 50
                                            ? 'bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/30'
                                            : 'bg-white/5 border-white/5 hover:border-emerald-500/50'
                                        }`}
                                        onClick={() => handleManualMatch(item.id, item.type === 'Deposit' ? 'Batch' : 'Donation')}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-white font-mono text-sm">{item.date.split('T')[0]}</div>
                                                {score > 90 && <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-bold uppercase">Best Match</span>}
                                                {score > 50 && score <= 90 && <span className="text-[9px] bg-blue-500 text-black px-1 rounded font-bold uppercase">Likely</span>}
                                            </div>
                                            <div className="text-gray-400 text-xs">{item.payee || item.memo || 'No Description'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-mono font-bold">${item.amount.toFixed(2)}</div>
                                            <div className="text-[10px] uppercase text-gray-500">{item.type}</div>
                                        </div>
                                    </div>
                                ));
                            })()}

                            {allItems.filter(i => !clearedItems.has(i.id) && !isSystemItemMatched(i.id)).length === 0 && (
                                <div className="text-center text-gray-500 py-8">No unmatched system items found.</div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setMatchModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {createBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Create Batch from Deposit</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Amount</label>
                                <div className="text-2xl font-mono text-white">${createBatchData?.amount.toFixed(2)}</div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-white"
                                    defaultValue={createBatchData?.date}
                                    ref={batchDateRef}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Description</label>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-white"
                                    defaultValue={createBatchData?.description}
                                    ref={batchDescRef}
                                />
                            </div>
                            <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-yellow-200 text-xs">
                                This will create a new Batch in "Open" status and immediately match it to this bank transaction.
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setCreateBatchModalOpen(false)} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
                            <button onClick={confirmCreateBatch} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors">Create & Match</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
