/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReconciliationStart() {
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        clientId: '',
        endingDate: new Date().toISOString().slice(0, 10),
        endingBalance: '',
        beginningBalance: '0.00'
    });
    const [loading, setLoading] = useState(false);

    // Dynamic Data
    const [lastStatementDate, setLastStatementDate] = useState<string | null>(null);
    const [statementHistory, setStatementHistory] = useState<any[]>([]);
    const [showStatements, setShowStatements] = useState(false);

    useEffect(() => {
        fetch('/api/clients', { cache: 'no-store' }).then(res => res.json()).then(data => {
            setClients(data || []);
            if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, clientId: data[0].ClientID }));
            }
        }).catch(console.error);
    }, []);

    // Fetch Last Statement Info & History
    useEffect(() => {
        if (!formData.clientId) return;

        // Reset defaults
        setLastStatementDate(null);
        setStatementHistory([]);
        setFormData(prev => ({ ...prev, beginningBalance: '0.00' }));

        fetch(`/api/reconciliation/periods?clientId=${formData.clientId}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                const history = Array.isArray(data) ? data : [];
                setStatementHistory(history);

                if (history.length > 0) {
                    const last = history[0]; // assuming API returns sorted DESC
                    const d = new Date(last.PeriodEndDate);
                    setLastStatementDate(d.toLocaleDateString());

                    // Auto-set the beginning balance from last period's ending if available?
                    // For now, we'll leave it as manual or mock 100.00 if user preferred, 
                    // but typically it comes from the last reconciled balance.
                    // setFormData(prev => ({ ...prev, beginningBalance: last.EndingBalance || '0.00' }));
                } else {
                    setLastStatementDate('No prior statements');
                }
            })
            .catch(console.error);

    }, [formData.clientId]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const d = new Date(formData.endingDate);
        const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);

        try {
            const res = await fetch('/api/reconciliation/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: formData.clientId,
                    startDate: startDate,
                    endDate: formData.endingDate,
                    statementEndingBalance: parseFloat(formData.endingBalance)
                })
            });

            if (res.ok) {
                const period = await res.json();
                if (!period.ReconciliationPeriodID) {
                    alert("Error: API did not return a valid ReconciliationPeriodID. Please contact support.");
                    return;
                }
                router.push(`/reconciliation/${period.ReconciliationPeriodID}`);
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to start reconciliation');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-12">
            <header className="flex justify-between items-start mb-12">
                <div>
                    {/* Breadcrumbs Removed */}
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-display font-medium text-white tracking-tight">Reconciliation</h1>
                    </div>
                    <p className="text-gray-400 mt-2 font-light">Prepare your accounts for close.</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 border border-white/10 text-gray-400 rounded hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">History by account</button>
                </div>
            </header>

            <form onSubmit={handleStart} className="glass-panel p-12 max-w-4xl border border-white/5 bg-[#09090b]/50 backdrop-blur-md rounded-2xl shadow-xl">
                <div className="mb-12">
                    <h2 className="text-xl text-white mb-6 font-display">Which account do you want to reconcile?</h2>

                    <div className="flex gap-4 items-end">
                        <div className="w-full max-w-md">
                            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-bold">Account</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-white/30 focus:ring-1 focus:ring-white/20 outline-none transition-all appearance-none cursor-pointer hover:bg-[#27272a]"
                                    value={formData.clientId}
                                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                >
                                    {clients.map(c => (
                                        <option key={c.ClientID} value={c.ClientID}>
                                            {c.ClientCode} {c.ClientName}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="mb-0.5">
                            <button
                                type="button"
                                onClick={() => setShowStatements(true)}
                                className="text-gray-300 font-medium border border-white/10 px-6 py-3 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                            >
                                View statements
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <h2 className="text-xl text-white font-display">Add the following information</h2>
                        <span className="text-gray-500 text-xs font-mono">
                            Last statement ending date: <span className="text-white">{lastStatementDate || 'Loading...'}</span>
                        </span>
                    </div>

                    <div className="flex gap-12">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Beginning balance</label>
                            <div className="text-2xl font-mono text-gray-300">${formData.beginningBalance}</div>
                        </div>

                        <div>
                            <label htmlFor="endingBalance" className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Statement ending balance</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors">$</span>
                                <input
                                    id="endingBalance"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-48 bg-[#18181b] border border-white/10 rounded-lg pl-7 pr-3 py-2 text-white font-mono focus:border-white/30 focus:ring-1 focus:ring-white/20 outline-none transition-all placeholder-gray-700"
                                    value={formData.endingBalance}
                                    placeholder="0.00"
                                    onChange={e => setFormData({ ...formData, endingBalance: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="endingDate" className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Statement ending date</label>
                            <input
                                id="endingDate"
                                type="date"
                                required
                                className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-white/30 focus:ring-1 focus:ring-white/20 outline-none transition-all"
                                value={formData.endingDate}
                                onChange={e => setFormData({ ...formData, endingDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {loading ? 'Setting up...' : 'Start Reconciling'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Statements History Modal */}
            {showStatements && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="glass-panel w-full max-w-2xl p-8 border border-white/10 bg-[#09090b] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-display text-white">Statement History</h2>
                            <button onClick={() => setShowStatements(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {statementHistory.length === 0 ? (
                                <p className="text-gray-500 italic text-center py-8">No prior statements found.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-white/5 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Start Date</th>
                                            <th className="px-4 py-3 font-semibold">End Date</th>
                                            <th className="px-4 py-3 font-semibold">Status</th>
                                            <th className="px-4 py-3 text-right font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {statementHistory.map(period => (
                                            <tr key={period.ReconciliationPeriodID} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-4 py-4 text-gray-300 font-mono">{new Date(period.PeriodStartDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-4 text-white font-medium font-mono">{new Date(period.PeriodEndDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold border ${period.Status === 'Closed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {period.Status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Link
                                                        href={`/reconciliation/${period.ReconciliationPeriodID}`}
                                                        className="text-gray-400 hover:text-white text-xs uppercase font-bold transition-colors"
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
