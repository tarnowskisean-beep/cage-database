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
                        <h1 className="text-3xl font-display font-bold text-white">Reconcile</h1>
                        <span className="text-gray-500 hover:text-gray-300 cursor-pointer">ⓘ</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* Summary Button Removed */}
                    <button className="px-4 py-2 border border-green-500 text-green-500 rounded font-medium hover:bg-green-500/10 transition-colors">History by account</button>
                </div>
            </header>

            <form onSubmit={handleStart} className="glass-panel p-12 max-w-4xl">
                <div className="mb-12">
                    <h2 className="text-xl text-gray-400 mb-4 font-light">Which account do you want to reconcile?</h2>

                    <div className="flex gap-4 items-end">
                        <div className="w-full max-w-md">
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Account</label>
                            <select
                                className="w-full bg-[#111] border border-gray-700 rounded px-4 py-3 text-white focus:border-green-500 outline-none transition-colors appearance-none"
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                            >
                                {clients.map(c => (
                                    <option key={c.ClientID} value={c.ClientID}>
                                        {c.ClientCode} {c.ClientName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-0.5">
                            <button
                                type="button"
                                onClick={() => setShowStatements(true)}
                                className="text-green-500 font-bold border border-green-500 px-6 py-3 rounded hover:bg-green-500/10 transition-colors"
                            >
                                View statements
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                        <h2 className="text-xl text-gray-300 font-light">Add the following information</h2>
                        <span className="text-blue-400 text-xs cursor-pointer hover:underline">
                            Last statement ending date: {lastStatementDate || 'Loading...'}
                        </span>
                    </div>

                    <div className="flex gap-12">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-2">Beginning balance</label>
                            <div className="text-lg font-mono text-white">{formData.beginningBalance}</div>
                        </div>

                        <div>
                            <label htmlFor="endingBalance" className="block text-xs font-bold text-gray-300 mb-2">Statement ending balance</label>
                            <div className="relative">
                                <input
                                    id="endingBalance"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-40 bg-white border border-gray-300 rounded px-3 py-2 text-black font-mono focus:ring-2 focus:ring-green-500 outline-none"
                                    value={formData.endingBalance}
                                    onChange={e => setFormData({ ...formData, endingBalance: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="endingDate" className="block text-xs font-bold text-gray-300 mb-2">Statement ending date</label>
                            <input
                                id="endingDate"
                                type="date"
                                required
                                className="bg-white border border-gray-300 rounded px-3 py-2 text-black"
                                value={formData.endingDate}
                                onChange={e => setFormData({ ...formData, endingDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-bold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Setting up...' : 'Start reconciling'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Statements History Modal */}
            {showStatements && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="glass-panel w-full max-w-2xl p-8 border border-white/10 bg-[#09090b] max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-display text-white">Statement History</h2>
                            <button onClick={() => setShowStatements(false)} className="text-gray-500 hover:text-white">✕</button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {statementHistory.length === 0 ? (
                                <p className="text-gray-500 italic text-center py-8">No prior statements found.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-white/5 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Start Date</th>
                                            <th className="px-4 py-3">End Date</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {statementHistory.map(period => (
                                            <tr key={period.ReconciliationPeriodID} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-gray-300">{new Date(period.PeriodStartDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-white font-medium">{new Date(period.PeriodEndDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide border ${period.Status === 'Closed' ? 'border-emerald-500/30 text-emerald-400' : 'border-blue-500/30 text-blue-400'
                                                        }`}>
                                                        {period.Status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={`/reconciliation/${period.ReconciliationPeriodID}`}
                                                        className="text-green-500 hover:underline text-xs uppercase font-bold"
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
