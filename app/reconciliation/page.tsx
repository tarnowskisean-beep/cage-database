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
        beginningBalance: '0.00' // Placeholder, ideally fetched
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/clients', { cache: 'no-store' }).then(res => res.json()).then(data => {
            setClients(data || []);
            if (data && data.length > 0) {
                setFormData(prev => ({ ...prev, clientId: data[0].ClientID }));
            }
        }).catch(console.error);
    }, []);

    // Effect to fetch last period's ending balance when client changes
    useEffect(() => {
        if (!formData.clientId) return;
        // Mock fetch or actual logic to get 'beginning balance' (last reconciled balance)
        // fetch(\`/api/reconciliation/last-balance?clientId=\${formData.clientId}\`)...
        // For now, static or random for demo
        setFormData(prev => ({ ...prev, beginningBalance: '100.00' }));
    }, [formData.clientId]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Calculate Start Date (Simple logic: Month start or day after last period)
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
                    statementEndingBalance: parseFloat(formData.endingBalance) // Pass this initial target
                })
            });

            if (res.ok) {
                const period = await res.json();
                router.push(\`/reconciliation/\${period.ReconciliationPeriodID}\`);
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
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-500 text-sm">Chart of accounts</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-gray-500 text-sm">Bank register</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-white text-sm">Reconcile</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-display font-bold text-white">Reconcile</h1>
                        <span className="text-gray-500 hover:text-gray-300 cursor-pointer">ⓘ</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="text-[var(--color-accent)] font-medium hover:underline">Summary</button>
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
                            <button type="button" className="text-green-500 font-bold border border-green-500 px-6 py-3 rounded hover:bg-green-500/10 transition-colors">
                                View statements
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                        <h2 className="text-xl text-gray-300 font-light">Add the following information</h2>
                        <span className="text-blue-400 text-xs cursor-pointer hover:underline">Last statement ending date 11/30/2025</span>
                    </div>

                    <div className="flex gap-12">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-2">Beginning balance</label>
                            <div className="text-lg font-mono text-white">{formData.beginningBalance}</div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-2">Statement ending balance</label>
                            <div className="relative">
                                <input
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
                            <label className="block text-xs font-bold text-gray-300 mb-2">Statement ending date</label>
                            <input
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
        </div>
    );
}
