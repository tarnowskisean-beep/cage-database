'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function BatchesContent() {
    const router = useRouter();
    const [batches, setBatches] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [stats, setStats] = useState({ open: 0, closed: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [clientFilter, setClientFilter] = useState('All');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Fetch batches and clients
    useEffect(() => {
        const fetchBatches = fetch('/api/batches').then(res => res.json());
        const fetchClients = fetch('/api/clients').then(res => res.json());

        Promise.all([fetchBatches, fetchClients])
            .then(([batchData, clientData]) => {
                const safeBatches = Array.isArray(batchData) ? batchData : [];
                const safeClients = Array.isArray(clientData) ? clientData : [];

                setBatches(safeBatches);
                setClients(safeClients);

                // Calculate quick stats
                const open = safeBatches.filter((b: any) => b.Status === 'Open').length;
                const closed = safeBatches.filter((b: any) => b.Status === 'Closed').length;
                setStats({ open, closed, total: safeBatches.length });
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const filteredBatches = batches.filter(b => {
        const matchesStatus = statusFilter === 'All' || b.Status === statusFilter;
        const matchesClient = clientFilter === 'All' || b.ClientCode === clientFilter;
        return matchesStatus && matchesClient;
    });

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Processing</h2>
                    <h1 className="text-4xl text-white font-display">Batches</h1>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary"
                >
                    + New Batch
                </button>
            </header>

            {/* Filter Bar & Stats */}
            <div className="flex flex-col xl:flex-row gap-6 mb-8">
                {/* Stats Group */}
                <div className="flex gap-4">
                    <div className="glass-panel px-6 py-4 flex flex-col justify-center min-w-[140px]">
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Open</span>
                        <span className="text-2xl text-white font-display mt-1">{stats.open}</span>
                    </div>
                    <div className="glass-panel px-6 py-4 flex flex-col justify-center min-w-[140px]">
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Closed</span>
                        <span className="text-2xl text-white font-display mt-1">{stats.closed}</span>
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* Filters */}
                <div className="flex gap-4 items-center">
                    {/* Client Filter */}
                    <select
                        className="glass-panel px-4 py-2 text-sm text-gray-300 bg-transparent border-none focus:ring-0 cursor-pointer min-w-[150px]"
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                    >
                        <option value="All">All Clients</option>
                        {clients.map(c => (
                            <option key={c.ClientID} value={c.ClientCode}>{c.ClientCode} - {c.ClientName}</option>
                        ))}
                    </select>

                    {/* Status Tabs */}
                    <div className="glass-panel p-1 flex">
                        {['All', 'Open', 'Closed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`
                                    px-6 py-2 rounded text-sm font-medium transition-all
                                    ${statusFilter === f
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Batches Table */}
            <div className="glass-panel overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse uppercase tracking-widest text-xs">Loading Batches...</div>
                ) : filteredBatches.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">No batches found matching filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Client</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Count</th>
                                    <th className="text-right">Total</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBatches.map(batch => (
                                    <tr key={batch.BatchID} onClick={() => router.push(`/batches/${batch.BatchID}/enter`)} className="cursor-pointer group">
                                        <td>
                                            <span className="font-mono text-gray-300 text-xs group-hover:text-white transition-colors">
                                                {batch.BatchCode}
                                            </span>
                                        </td>
                                        <td className="font-medium text-white">{batch.ClientCode}</td>
                                        <td className="text-center">
                                            <span className={`
                                                inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
                                                ${batch.Status === 'Open'
                                                    ? 'bg-white/10 text-white border-white/20'
                                                    : 'bg-zinc-800 text-gray-500 border-zinc-700'
                                                }
                                            `}>
                                                {batch.Status}
                                            </span>
                                        </td>
                                        <td className="text-right text-gray-400 font-mono">{batch.ItemCount}</td>
                                        <td className="text-right font-medium text-white font-mono">
                                            ${Number(batch.TotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-right">
                                            <span className="text-gray-500 group-hover:text-white transition-colors text-xs uppercase font-bold tracking-wide">
                                                Manage &rarr;
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && <CreateBatchModal onClose={() => setShowCreateModal(false)} refresh={() => window.location.reload()} />}
        </div>
    );
}

function CreateBatchModal({ onClose, refresh }: { onClose: () => void, refresh: () => void }) {
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        clientId: '',
        description: '',
        date: new Date().toISOString().substring(0, 10),
        entryMode: 'Data Entry',
        paymentCategory: 'Check',
        defaultGiftPlatform: 'Chainbridge',
        defaultTransactionType: 'Contribution',
        defaultGiftYear: new Date().getFullYear().toString(),
        defaultGiftQuarter: 'Q1'
    });

    useEffect(() => {
        fetch('/api/clients').then(r => r.json()).then(setClients);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/batches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        refresh();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="glass-panel w-full max-w-md p-8 border border-white/10 bg-[#09090b]">
                <h2 className="text-2xl font-display text-white mb-6">Create New Batch</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client</label>
                        <select
                            className="input-field"
                            value={formData.clientId}
                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                            required
                        >
                            <option value="">Select Client...</option>
                            {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Description</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Usage / Notes"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Entry Mode</label>
                            <select
                                className="input-field"
                                value={formData.entryMode}
                                onChange={e => setFormData({ ...formData, entryMode: e.target.value })}
                            >
                                <option value="Data Entry">Data Entry</option>
                                <option value="Import">Import</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Payment Category</label>
                            <select
                                className="input-field"
                                value={formData.paymentCategory}
                                onChange={e => setFormData({ ...formData, paymentCategory: e.target.value })}
                            >
                                <option value="Check">Check</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Cash">Cash</option>
                                <option value="Wire">Wire</option>
                                <option value="In-Kind">In-Kind</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Platform / Source</label>
                        <select
                            className="input-field"
                            value={formData.defaultGiftPlatform}
                            onChange={e => setFormData({ ...formData, defaultGiftPlatform: e.target.value })}
                        >
                            <option value="Chainbridge">Chainbridge</option>
                            <option value="Stripe">Stripe</option>
                            <option value="Anedot">Anedot</option>
                            <option value="Winred">Winred</option>
                            <option value="City National">City National</option>
                            <option value="National Capital">National Capital</option>
                            <option value="Propay">Propay</option>
                            <option value="Cage">Cage (Internal)</option>
                        </select>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                        <button type="submit" className="flex-1 btn-primary">Create Batch</button>
                    </div>
                </form>
            </div >
        </div >
    );
}

export default function BatchesPage() {
    return (
        <Suspense fallback={null}>
            <BatchesContent />
        </Suspense>
    );
}
