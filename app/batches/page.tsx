"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Batch, Client } from '@/types';

export default function BatchesPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const router = useRouter();

    // Calculate default weekly range (Sat -> Fri)
    const getWeeklyRange = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = (day + 1) % 7;
        const start = new Date(today);
        start.setDate(today.getDate() - diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return {
            start: formatDate(start),
            end: formatDate(end)
        };
    };

    const defaultRange = getWeeklyRange();
    const [filters, setFilters] = useState({
        clientId: '',
        status: '',
        platform: '',
        startDate: defaultRange.start,
        endDate: defaultRange.end
    });

    const fetchBatches = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.clientId) params.append('clientId', filters.clientId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.status) params.append('status', filters.status);
            if (filters.platform) params.append('platform', filters.platform);

            const res = await fetch(`/api/batches?${params.toString()}`);
            if (res.ok) setBatches(await res.json());
        } catch (err) { console.error(err); }
    };

    const [platforms, setPlatforms] = useState<string[]>([]);

    // Load Data
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch('/api/clients');
                if (res.ok) setClients(await res.json());
            } catch (err) { console.error(err); }
        };

        const fetchPlatforms = async () => {
            try {
                const res = await fetch('/api/platforms');
                if (res.ok) setPlatforms(await res.json());
            } catch (err) { console.error(err); }
        };

        fetchClients();
        fetchPlatforms();
    }, []);

    useEffect(() => {
        // eslint-disable-next-line
        fetchBatches();
    }, [filters]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="page-header mb-8">
                <div>
                    <h1 className="text-3xl font-display text-white mb-2">Batches</h1>
                    <p className="text-gray-400">Manage and process donation batches</p>
                </div>
                <button className="btn-primary flex items-center gap-2 px-6 py-3" onClick={() => setShowCreateModal(true)}>
                    + New Batch
                </button>
            </header>

            {/* Filter Bar */}
            <div className="glass-panel p-4 mb-8 flex flex-wrap gap-4 items-center bg-[#1a1a1a]">
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-xl">🔍</span>
                    <span className="font-semibold text-sm uppercase tracking-wide">Filters:</span>
                </div>

                <select
                    className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none min-w-[200px]"
                    value={filters.clientId}
                    onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
                >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                        <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                    ))}
                </select>

                <select
                    className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none min-w-[150px]"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Reconciled">Reconciled</option>
                </select>

                <select
                    className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none min-w-[150px]"
                    value={filters.platform}
                    onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                >
                    <option value="">All Platforms</option>
                    {platforms.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs uppercase font-bold">From</span>
                    <input
                        type="date"
                        className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs uppercase font-bold">To</span>
                    <input
                        type="date"
                        className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                {(filters.clientId || filters.startDate || filters.endDate || filters.status || filters.platform) && (
                    <button
                        onClick={() => setFilters({ clientId: '', startDate: '', endDate: '', status: '', platform: '' })}
                        className="text-red-400 text-sm hover:text-red-300 transition-colors ml-auto"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Batch Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard label="Open Batches" value={batches.filter(b => b.Status === 'Open').length.toString()} icon="📂" />
                <StatCard label="Pending Review" value={batches.filter(b => b.Status === 'Submitted').length.toString()} icon="👀" />
                <StatCard label="Total Batches" value={batches.length.toString()} icon="📊" />
            </div>

            {/* Batch List */}
            <div className="glass-panel p-0 bg-[#1a1a1a] overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-lg font-display text-white">Active Batches</h3>
                </div>
                {batches.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No batches found. Create one to get started.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Batch ID</th>
                                <th className="p-4 font-semibold">Client</th>
                                <th className="p-4 font-semibold">Created</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Mode</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {batches.map(batch => (
                                <BatchRow key={batch.BatchID} batch={batch} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && <CreateBatchModal clients={clients} onClose={() => setShowCreateModal(false)} />}
        </div>
    );
}

function CreateBatchModal({ clients, onClose }: { clients: Client[], onClose: () => void }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentQuarter = Math.ceil((currentMonth + 1) / 3);

    const [formData, setFormData] = useState({
        clientId: '',
        entryMode: 'Barcode',
        paymentCategory: 'Checks',
        zerosType: '',
        defaultGiftMethod: 'Check',
        defaultGiftPlatform: 'Cage',
        defaultTransactionType: 'Donation',
        defaultGiftType: 'Individual/Trust/IRA',
        date: new Date().toLocaleDateString('en-CA'), // Returns YYYY-MM-DD in local time
        defaultGiftYear: currentYear,
        defaultGiftQuarter: `Q${currentQuarter}`
    });

    // Options Lists from User Requirements
    const methodOptions = ['Check', 'Cash', 'Credit Card', 'Chargeback', 'EFT', 'Stock', 'Crypto'];
    const platformOptions = ['Chainbridge', 'Stripe', 'National Capital', 'City National', 'Propay', 'Anedot', 'Winred', 'Cage', 'Import'];
    const giftTypeOptions = ['Individual/Trust/IRA', 'Corporate', 'Foundation', 'Donor-Advised Fund'];

    const handleSubmit = async () => {
        if (!formData.clientId) return alert('Select a client');
        setLoading(true);
        try {
            const res = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                // Redirect to enter page
                router.push(`/batches/${data.BatchID}/enter`);
            } else {
                console.error('Batch creation failed:', data);
                alert(`Error creating batch: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <div className="glass-panel w-[800px] p-8 bg-[#1a1a1a]">
                <h2 className="text-xl font-bold text-white mb-6">Start New Batch</h2>

                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-3">
                        <label className="block mb-2 font-medium text-gray-300">Client</label>
                        <select
                            className="input-field w-full bg-[#111] border border-gray-700 p-2 rounded text-white"
                            value={formData.clientId}
                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                        >
                            <option value="">Select Client...</option>
                            {clients.map(c => (
                                <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-3">
                        <label className="block mb-2 font-medium text-gray-300">Entry Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            {/* Combined Barcode/Datamatrix into single 'Scan' option, storing as 'Barcode' for DB compatibility */}
                            <ModeOption
                                label="Scan"
                                selected={formData.entryMode === 'Barcode'}
                                onClick={() => setFormData({ ...formData, entryMode: 'Barcode' })}
                            />
                            {['Manual', 'ZerosOCR'].map(mode => (
                                <ModeOption
                                    key={mode}
                                    label={mode}
                                    selected={formData.entryMode === mode}
                                    onClick={() => setFormData({ ...formData, entryMode: mode })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-300">Batch Date</label>
                        <input
                            type="date"
                            className="input-field w-full bg-[#111] border border-gray-700 p-2 rounded text-white"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-300">Default Gift Year</label>
                        <select
                            className="input-field w-full bg-[#111] border border-gray-700 p-2 rounded text-white"
                            value={formData.defaultGiftYear}
                            onChange={e => setFormData({ ...formData, defaultGiftYear: parseInt(e.target.value) })}
                        >
                            <option value={currentYear + 1}>{currentYear + 1}</option>
                            <option value={currentYear}>{currentYear}</option>
                            <option value={currentYear - 1}>{currentYear - 1}</option>
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-300">Default Quarter</label>
                        <select
                            className="input-field w-full bg-[#111] border border-gray-700 p-2 rounded text-white"
                            value={formData.defaultGiftQuarter}
                            onChange={e => setFormData({ ...formData, defaultGiftQuarter: e.target.value })}
                        >
                            <option>Q1</option>
                            <option>Q2</option>
                            <option>Q3</option>
                            <option>Q4</option>
                        </select>
                    </div>

                    <div>
                        <CreatableSelect
                            label="Default Method"
                            options={methodOptions}
                            value={formData.defaultGiftMethod}
                            onChange={val => setFormData({ ...formData, defaultGiftMethod: val })}
                        />
                    </div>

                    <div>
                        <CreatableSelect
                            label="Default Platform"
                            options={platformOptions}
                            value={formData.defaultGiftPlatform}
                            onChange={val => setFormData({ ...formData, defaultGiftPlatform: val })}
                        />
                    </div>

                    <div>
                        <CreatableSelect
                            label="Default Gift Type"
                            options={giftTypeOptions}
                            value={formData.defaultGiftType}
                            onChange={val => setFormData({ ...formData, defaultGiftType: val })}
                        />
                    </div>

                    <div className="col-span-3 mt-4 pt-4 border-t border-gray-800">
                        <div className="flex gap-4">
                            <button className="btn-primary flex-1 py-2" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Batch'}
                            </button>
                            <button
                                className="flex-1 py-2 border border-gray-700 text-gray-300 rounded hover:bg-white/5 transition-colors"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: string }) {
    return (
        <div className="glass-panel p-6 flex items-center gap-4 bg-[#1a1a1a]">
            <div className="text-3xl">{icon}</div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
            </div>
        </div>
    );
}

function BatchRow({ batch }: { batch: Batch }) {
    return (
        <tr className="hover:bg-white/5 transition-colors group">
            <td className="p-4 font-mono font-semibold text-white">{batch.BatchCode}</td>
            <td className="p-4 text-gray-300">{batch.ClientCode}</td>
            <td className="p-4 text-gray-500">{new Date(batch.Date).toLocaleDateString()}</td>
            <td className="p-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${batch.Status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    batch.Status === 'Closed' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        batch.Status === 'Reconciled' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                    {batch.Status}
                </span>
            </td>
            <td className="p-4 text-gray-400">{batch.EntryMode}</td>
            <td className="p-4">
                <div className="flex gap-4 items-center">
                    <Link href={`/batches/${batch.BatchID}/enter`} className="text-[var(--color-primary)] hover:text-white font-medium transition-colors">
                        Open &rarr;
                    </Link>
                    {(batch as any).ImportSessionID && (
                        <a
                            href={`/api/batches/download/${batch.BatchID}`}
                            title="Download Original CSV"
                            className="text-lg hover:scale-110 transition-transform"
                        >
                            📥
                        </a>
                    )}
                </div>
            </td>
        </tr>
    );
}

// Reusable Component for Select + Custom Entry
function CreatableSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) {
    const isCustom = value && !options.includes(value);
    const [mode, setMode] = useState<'select' | 'input'>(isCustom ? 'input' : 'select');

    return (
        <div>
            <label className="block mb-2 font-medium text-gray-300">{label}</label>
            {mode === 'select' ? (
                <select
                    className="input-field w-full bg-[#111] border border-gray-700 p-2 rounded text-white"
                    value={value}
                    onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                            setMode('input');
                            onChange('');
                        } else {
                            onChange(e.target.value);
                        }
                    }}
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    <option className="font-bold text-[var(--color-primary)]" value="__NEW__">+ Add New...</option>
                </select>
            ) : (
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1 bg-[#111] border border-gray-700 p-2 rounded text-white"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={`Enter new ${label.toLowerCase()}...`}
                        autoFocus
                    />
                    <button
                        onClick={() => setMode('select')}
                        className="px-4 py-2 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 text-white transition-colors"
                        title="Cancel custom entry"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

function ModeOption({ label, selected, onClick }: { label: string, selected?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-md border font-medium transition-all ${selected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-gray-700 hover:border-gray-500 text-gray-400'
                }`}
        >
            {label}
        </button>
    );
}
