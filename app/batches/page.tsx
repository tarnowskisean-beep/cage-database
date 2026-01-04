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
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        return { start: formatDate(start), end: formatDate(end) };
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
            <header className="page-header mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-display font-bold text-white mb-2 drop-shadow-md">Batches</h1>
                    <p className="text-gray-400 font-light">Manage and process donation batches</p>
                </div>
                <button className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all" onClick={() => setShowCreateModal(true)}>
                    <span className="text-xl leading-none">+</span> New Batch
                </button>
            </header>

            {/* Filter Bar */}
            <div className="glass-panel p-4 mb-8 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-blue-400">
                    <span className="text-xl">🔍</span>
                    <span className="font-semibold text-xs uppercase tracking-wider">Filters</span>
                </div>

                <select
                    className="input-field min-w-[200px]"
                    value={filters.clientId}
                    onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
                >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                        <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                    ))}
                </select>

                <select
                    className="input-field min-w-[150px]"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Reconciled">Reconciled</option>
                </select>

                <select
                    className="input-field min-w-[150px]"
                    value={filters.platform}
                    onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                >
                    <option value="">All Platforms</option>
                    {platforms.map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">From</span>
                    <input
                        type="date"
                        className="input-field"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">To</span>
                    <input
                        type="date"
                        className="input-field"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                {(filters.clientId || filters.startDate !== defaultRange.start || filters.endDate !== defaultRange.end || filters.status || filters.platform) && (
                    <button
                        onClick={() => setFilters({ clientId: '', startDate: '', endDate: '', status: '', platform: '' })}
                        className="text-red-400 text-xs hover:text-red-300 transition-colors ml-auto uppercase font-bold tracking-wide"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Batch Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard label="Open Batches" value={batches.filter(b => b.Status === 'Open').length.toString()} icon="📂" color="text-green-400" />
                <StatCard label="Pending Review" value={batches.filter(b => b.Status === 'Submitted').length.toString()} icon="👀" color="text-amber-400" />
                <StatCard label="Total Batches" value={batches.length.toString()} icon="📊" color="text-blue-400" />
            </div>

            {/* Batch List */}
            <div className="glass-panel p-0 overflow-hidden">
                <div className="p-6 border-b border-[var(--glass-border)] bg-white/5">
                    <h3 className="text-lg font-display text-white font-bold tracking-wide">Active Batches</h3>
                </div>
                {batches.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">No batches found. Create one to get started.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Batch ID</th>
                                <th>Client</th>
                                <th>Created</th>
                                <th>Status</th>
                                <th>Mode</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
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
        date: new Date().toLocaleDateString('en-CA'),
        defaultGiftYear: currentYear,
        defaultGiftQuarter: `Q${currentQuarter}`
    });

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
            <div className="glass-panel w-full max-w-4xl p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-8 border-b border-[var(--glass-border)] pb-4">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-white">Start New Batch</h2>
                        <p className="text-sm text-gray-400 mt-1">Configure batch settings and defaults</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-2xl">
                        &times;
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-3">
                        <label className="block mb-2 font-medium text-blue-300 text-sm uppercase tracking-wide">Client</label>
                        <select
                            className="input-field text-lg py-3"
                            value={formData.clientId}
                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                        >
                            <option value="">Select Client...</option>
                            {clients.map(c => (
                                <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                        <label className="block mb-2 font-medium text-gray-300 text-sm uppercase tracking-wide">Entry Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                            <ModeOption
                                label="Scan (High Speed)"
                                selected={formData.entryMode === 'Barcode'}
                                onClick={() => setFormData({ ...formData, entryMode: 'Barcode' })}
                                icon="⚡"
                            />
                            {['Manual', 'ZerosOCR'].map(mode => (
                                <ModeOption
                                    key={mode}
                                    label={mode}
                                    selected={formData.entryMode === mode}
                                    onClick={() => setFormData({ ...formData, entryMode: mode })}
                                    icon={mode === 'Manual' ? '⌨️' : '🤖'}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-400 text-xs uppercase">Batch Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-400 text-xs uppercase">Default Gift Year</label>
                        <select
                            className="input-field"
                            value={formData.defaultGiftYear}
                            onChange={e => setFormData({ ...formData, defaultGiftYear: parseInt(e.target.value) })}
                        >
                            <option value={currentYear + 1}>{currentYear + 1}</option>
                            <option value={currentYear}>{currentYear}</option>
                            <option value={currentYear - 1}>{currentYear - 1}</option>
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block mb-2 font-medium text-gray-400 text-xs uppercase">Default Quarter</label>
                        <select
                            className="input-field"
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

                    <div className="col-span-1 md:col-span-3 mt-8 pt-8 border-t border-[var(--glass-border)] flex gap-4">
                        <button className="btn-primary flex-1 py-3 text-lg shadow-lg hover:shadow-blue-500/20" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Creating Batch...' : 'Create Batch'}
                        </button>
                        <button
                            className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string, value: string, icon: string, color?: string }) {
    return (
        <div className="glass-panel p-6 flex items-center gap-6 group hover:border-white/10 transition-all">
            <div className="text-4xl bg-white/5 p-4 rounded-xl shadow-inner">{icon}</div>
            <div>
                <div className={`text-3xl font-bold font-display ${color || 'text-white'}`}>{value}</div>
                <div className="text-xs uppercase tracking-wider text-gray-400 font-medium mt-1">{label}</div>
            </div>
        </div>
    );
}

function BatchRow({ batch }: { batch: Batch }) {
    return (
        <tr className="group transition-colors">
            <td className="font-mono font-semibold text-blue-300 group-hover:text-blue-200">{batch.BatchCode}</td>
            <td className="text-gray-300">{batch.ClientCode}</td>
            <td className="text-gray-500 text-sm">{new Date(batch.Date).toLocaleDateString()}</td>
            <td>
                <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${batch.Status === 'Open' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    batch.Status === 'Closed' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        batch.Status === 'Reconciled' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                    {batch.Status}
                </span>
            </td>
            <td className="text-gray-400 text-sm">{batch.EntryMode}</td>
            <td>
                <div className="flex gap-4 items-center">
                    <Link href={`/batches/${batch.BatchID}/enter`} className="text-blue-400 hover:text-white font-medium transition-colors text-sm hover:underline">
                        Open &rarr;
                    </Link>
                    {(batch as any).ImportSessionID && (
                        <a
                            href={`/api/batches/download/${batch.BatchID}`}
                            title="Download Original CSV"
                            className="text-lg hover:scale-110 transition-transform opacity-50 hover:opacity-100"
                        >
                            📥
                        </a>
                    )}
                </div>
            </td>
        </tr>
    );
}

function CreatableSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) {
    const isCustom = value && !options.includes(value);
    const [mode, setMode] = useState<'select' | 'input'>(isCustom ? 'input' : 'select');

    return (
        <div>
            <label className="block mb-2 font-medium text-gray-400 text-xs uppercase">{label}</label>
            {mode === 'select' ? (
                <select
                    className="input-field"
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
                    <option className="font-bold text-blue-400" value="__NEW__">+ Add New...</option>
                </select>
            ) : (
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={`Enter new ${label.toLowerCase()}...`}
                        autoFocus
                    />
                    <button
                        onClick={() => setMode('select')}
                        className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-white/10 text-white transition-colors"
                        title="Cancel custom entry"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

function ModeOption({ label, selected, onClick, icon }: { label: string, selected?: boolean, onClick: () => void, icon?: string }) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selected
                ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10 scale-105'
                : 'border-transparent bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                }`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </button>
    );
}
