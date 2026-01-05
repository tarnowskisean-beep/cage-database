'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { METHODS, PLATFORMS, GIFT_TYPES, TRANSACTION_TYPES } from '@/lib/constants';

function BatchesContent() {
    const router = useRouter();
    const [batches, setBatches] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [stats, setStats] = useState({ open: 0, closed: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All');
    const [clientFilter, setClientFilter] = useState('All');
    const [modeFilter, setModeFilter] = useState('All');

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
        return adjusted.toISOString().split('T')[0];
    };

    // Default Week Calculation: Most Recent Saturday -> Following Friday
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        const day = d.getDay(); // 0 is Sun, 6 is Sat
        // Calculate days since last Saturday (if today is Sat, 0. Sun, 1. Fri, 6)
        const daysSinceSat = (day + 1) % 7;
        d.setDate(d.getDate() - daysSinceSat);
        return getLocalDateString(d);
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const daysSinceSat = (day + 1) % 7;
        d.setDate(d.getDate() - daysSinceSat + 6); // +6 days from Saturday is Friday
        return getLocalDateString(d);
    });

    const [showCreateModal, setShowCreateModal] = useState(false);

    // Fetch batches and clients
    useEffect(() => {
        const fetchBatches = fetch('/api/batches', { cache: 'no-store' }).then(res => {
            if (!res.ok) throw new Error(`Batches API failed: ${res.status}`);
            return res.json();
        });
        const fetchClients = fetch('/api/clients', { cache: 'no-store' }).then(res => {
            if (!res.ok) throw new Error(`Clients API failed: ${res.status}`);
            return res.json();
        });

        Promise.all([fetchBatches, fetchClients])
            .then(([batchData, clientData]) => {
                const safeBatches = Array.isArray(batchData) ? batchData : [];
                const safeClients = Array.isArray(clientData) ? clientData : [];

                if (!Array.isArray(batchData)) console.error("Batches API returned non-array:", batchData);
                if (!Array.isArray(clientData)) console.error("Clients API returned non-array:", clientData);

                setBatches(safeBatches);
                setClients(safeClients);

                // Calculate quick stats (Treat Submitted as Closed)
                const open = safeBatches.filter((b: any) => b.Status === 'Open').length;
                const closed = safeBatches.filter((b: any) => ['Closed', 'Submitted'].includes(b.Status)).length;
                setStats({ open, closed, total: safeBatches.length });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load dashboard data:", err);
                setBatches([]);
                setClients([]);
                setLoading(false);
            });
    }, []);

    const filteredBatches = batches.filter(b => {
        // Status Filter (Group Submitted under Closed)
        const matchesStatus = statusFilter === 'All' ||
            (statusFilter === 'Open' && b.Status === 'Open') ||
            (statusFilter === 'Closed' && ['Closed', 'Submitted'].includes(b.Status));

        const matchesClient = clientFilter === 'All' || b.ClientCode === clientFilter;

        // Mode Filter Logic
        let matchesMode = modeFilter === 'All';
        if (!matchesMode && b.EntryMode) {
            const m = b.EntryMode.toUpperCase(); // DB Value
            const f = modeFilter.toUpperCase();  // Filter Value

            if (f === 'BARCODE/DATAMATRIX') {
                matchesMode = ['DATAMATRIX', 'BARCODE', 'SCAN/BARCODE', 'BARCODE/DATAMATRIX'].includes(m);
            } else {
                matchesMode = m === f;
            }
        }

        // Date Range Check
        const batchDate = b.Date ? b.Date.substring(0, 10) : '';
        const matchesDate = (!startDate || batchDate >= startDate) && (!endDate || batchDate <= endDate);

        return matchesStatus && matchesClient && matchesMode && matchesDate;
    });

    const totalCount = filteredBatches.length;
    const totalSum = filteredBatches.reduce((sum, b) => sum + (Number(b.TotalAmount) || 0), 0);

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Processing</h2>
                    <h1 className="text-4xl text-white font-display">Batches</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                    >
                        + New Batch
                    </button>
                </div>
            </header>

            {/* Filter Bar & Stats */}
            <div className="flex flex-col xl:flex-row gap-6 mb-8">
                {/* Stats Group - Dynamic based on filter */}
                <div className="flex gap-4">
                    <div className="glass-panel px-6 py-4 flex flex-col justify-center min-w-[140px]">
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{statusFilter === 'All' ? 'Total' : statusFilter} Count</span>
                        <span className="text-2xl text-white font-display mt-1">{totalCount}</span>
                    </div>
                    <div className="glass-panel px-6 py-4 flex flex-col justify-center min-w-[140px]">
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Total Value</span>
                        <span className="text-2xl text-white font-display mt-1">
                            ${totalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* Filters */}
                <div className="flex gap-4 items-center">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 glass-panel px-3 py-1 bg-zinc-900/50">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-gray-300 text-sm border-none focus:ring-0 w-[130px] p-0"
                        />
                        <span className="text-gray-600">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-gray-300 text-sm border-none focus:ring-0 w-[130px] p-0"
                        />
                    </div>

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

                    {/* Mode Filter */}
                    <select
                        className="glass-panel px-4 py-2 text-sm text-gray-300 bg-transparent border-none focus:ring-0 cursor-pointer min-w-[150px]"
                        value={modeFilter}
                        onChange={(e) => setModeFilter(e.target.value)}
                    >
                        <option value="All">All Modes</option>
                        <option value="Barcode/Datamatrix">Barcode/Datamatrix</option>
                        <option value="Manual">Manual</option>
                        <option value="Zeros">Zeros</option>
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
                                    <th>Mode</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Count</th>
                                    <th className="text-right">Total</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBatches.map(batch => {
                                    // Normalize Status Display
                                    const displayStatus = ['Closed', 'Submitted'].includes(batch.Status) ? 'Closed' : batch.Status;

                                    return (
                                        <tr key={batch.BatchID} onClick={() => router.push(`/batches/${batch.BatchID}/enter`)} className="cursor-pointer group">
                                            <td>
                                                <span className="font-mono text-gray-300 text-xs group-hover:text-white transition-colors">
                                                    {batch.BatchCode}
                                                </span>
                                            </td>
                                            <td className="font-medium text-white">{batch.ClientCode}</td>
                                            <td className="text-gray-400 text-xs uppercase tracking-wide">{batch.EntryMode}</td>
                                            <td className="text-center">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
                                                    ${displayStatus === 'Open'
                                                        ? 'bg-white/10 text-white border-white/20'
                                                        : 'bg-zinc-800 text-gray-500 border-zinc-700'
                                                    }
                                                `}>
                                                    {displayStatus}
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
                                    );
                                })}
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
    const router = useRouter();
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        clientId: '',
        description: '',
        date: (() => {
            const d = new Date();
            const offset = d.getTimezoneOffset();
            const adjusted = new Date(d.getTime() - (offset * 60 * 1000));
            return adjusted.toISOString().split('T')[0];
        })(),
        entryMode: 'Barcode/Datamatrix', // Updated default
        paymentCategory: 'Check',
        defaultGiftPlatform: 'Chainbridge',
        defaultTransactionType: 'Contribution',
        defaultGiftYear: new Date().getFullYear().toString(),
        defaultGiftQuarter: 'Q1',
        defaultGiftType: 'Individual/IRA/Trust'
    });

    useEffect(() => {
        fetch('/api/clients', { cache: 'no-store' }).then(res => res.json()).then(data => setClients(data || []));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || errData.details || 'Failed to create batch');
            }

            const newBatch = await res.json();

            if (newBatch && newBatch.BatchID) {
                router.push(`/batches/${newBatch.BatchID}/enter`);
            } else {
                refresh();
                onClose();
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to create batch');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="glass-panel w-full max-w-md p-8 border border-white/10 bg-[#09090b]">
                <h2 className="text-2xl font-display text-white mb-6">Create New Batch</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client</label>
                        <select
                            className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
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
                            className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Usage / Notes"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Date</label>
                        <input
                            type="date"
                            className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Entry Mode</label>
                            <select
                                className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                value={formData.entryMode}
                                onChange={e => setFormData({ ...formData, entryMode: e.target.value })}
                            >
                                <option value="Barcode/Datamatrix">Barcode/Datamatrix</option>
                                <option value="Manual">Manual</option>
                                <option value="Zeros">Zeros</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Payment Category</label>
                            <select
                                className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                value={formData.paymentCategory}
                                onChange={e => setFormData({ ...formData, paymentCategory: e.target.value })}
                            >
                                <option value="Check">Check</option>
                                <option value="Cash">Cash</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Online">Online</option>
                                <option value="EFT">EFT</option>
                                <option value="Stock">Stock</option>
                                <option value="Crypto">Crypto</option>
                                <option value="In-Kind">In-Kind</option>
                            </select>
                        </div>
                    </div>

                    {/* Defaults Section */}
                    <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">Batch Defaults</h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Platform</label>
                                <select
                                    className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                    value={formData.defaultGiftPlatform}
                                    onChange={e => setFormData({ ...formData, defaultGiftPlatform: e.target.value })}
                                >
                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Entity Type</label>
                                <select
                                    className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                    value={formData.defaultGiftType}
                                    onChange={e => setFormData({ ...formData, defaultGiftType: e.target.value })}
                                >
                                    {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Gift Year</label>
                                <input
                                    type="number"
                                    className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                    value={formData.defaultGiftYear}
                                    onChange={e => setFormData({ ...formData, defaultGiftYear: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Quarter</label>
                                <select
                                    className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                    value={formData.defaultGiftQuarter}
                                    onChange={e => setFormData({ ...formData, defaultGiftQuarter: e.target.value })}
                                >
                                    <option value="">None</option>
                                    <option value="Q1">Q1</option>
                                    <option value="Q2">Q2</option>
                                    <option value="Q3">Q3</option>
                                    <option value="Q4">Q4</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-white/10 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded bg-transparent border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary"
                        >
                            Create Batch
                        </button>
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
