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

            const res = await fetch(`/api/batches?${params.toString()}`);
            if (res.ok) setBatches(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/clients');
            if (res.ok) setClients(await res.json());
        } catch (err) { console.error(err); }
    };

    // Load Data
    useEffect(() => {
        // eslint-disable-next-line
        fetchClients();
    }, []);

    useEffect(() => {
        // eslint-disable-next-line
        fetchBatches();
    }, [filters]);

    return (
        <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Batches</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Manage and process donation batches</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    + New Batch
                </button>
            </header>

            {/* Filter Bar */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Filters:</span>
                </div>

                <select
                    className="input-field"
                    style={{ width: 'auto', minWidth: '200px' }}
                    value={filters.clientId}
                    onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
                >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                        <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                    ))}
                </select>

                <select
                    className="input-field"
                    style={{ width: 'auto', minWidth: '150px' }}
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Reconciled">Reconciled</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>From</span>
                    <input
                        type="date"
                        className="input-field"
                        style={{ width: 'auto' }}
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>To</span>
                    <input
                        type="date"
                        className="input-field"
                        style={{ width: 'auto' }}
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                {(filters.clientId || filters.startDate || filters.endDate || filters.status) && (
                    <button
                        onClick={() => setFilters({ clientId: '', startDate: '', endDate: '', status: '' })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Batch Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard label="Open Batches" value={batches.filter(b => b.Status === 'Open').length.toString()} icon="📂" />
                <StatCard label="Pending Review" value={batches.filter(b => b.Status === 'Submitted').length.toString()} icon="👀" />
                <StatCard label="Total Batches" value={batches.length.toString()} icon="📊" />
            </div>

            {/* Batch List */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Active Batches</h3>
                {batches.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No batches found. Create one to get started.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Batch ID</th>
                                <th style={{ padding: '1rem' }}>Client</th>
                                <th style={{ padding: '1rem' }}>Created</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Mode</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
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
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '800px', padding: '2rem', backgroundColor: 'var(--color-bg-surface)' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Start New Batch</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client</label>
                        <select
                            className="input-field"
                            value={formData.clientId}
                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                        >
                            <option value="">Select Client...</option>
                            {clients.map(c => (
                                <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Entry Mode</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
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

                    <div style={{ gridColumn: '1 / 2' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Batch Date</label>
                        <input
                            type="date"
                            className="input-field"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div style={{ gridColumn: '2 / 3' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Default Gift Year</label>
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

                    <div style={{ gridColumn: '3 / 4' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Default Quarter</label>
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

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Batch'}
                            </button>
                            <button
                                style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
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
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{label}</div>
            </div>
        </div>
    );
}

function BatchRow({ batch }: { batch: Batch }) {
    return (
        <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
            <td style={{ padding: '1rem', fontWeight: 600 }}>{batch.BatchCode}</td>
            <td style={{ padding: '1rem' }}>{batch.ClientCode}</td>
            <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{new Date(batch.Date).toLocaleDateString()}</td>
            <td style={{ padding: '1rem' }}>
                <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: batch.Status === 'Open' ? 'rgba(74, 222, 128, 0.2)' :
                        batch.Status === 'Closed' ? 'rgba(251, 146, 60, 0.2)' :
                            batch.Status === 'Reconciled' ? 'rgba(192, 132, 252, 0.2)' :
                                'rgba(148, 163, 184, 0.2)',
                    color: batch.Status === 'Open' ? '#4ade80' :
                        batch.Status === 'Closed' ? '#fb923c' :
                            batch.Status === 'Reconciled' ? '#c084fc' :
                                'var(--color-text-muted)',
                    border: `1px solid ${batch.Status === 'Open' ? '#4ade80' :
                        batch.Status === 'Closed' ? '#fb923c' :
                            batch.Status === 'Reconciled' ? '#c084fc' :
                                'var(--color-border)'
                        }`
                }}>
                    {batch.Status}
                </span>
            </td>
            <td style={{ padding: '1rem' }}>{batch.EntryMode}</td>
            <td style={{ padding: '1rem' }}>
                <Link href={`/batches/${batch.BatchID}/enter`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                    Open &rarr;
                </Link>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
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
                    <option style={{ fontWeight: 600, color: 'var(--color-primary)' }} value="__NEW__">+ Add New...</option>
                </select>
            ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input-field"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={`Enter new ${label.toLowerCase()}...`}
                        autoFocus
                    />
                    <button
                        onClick={() => setMode('select')}
                        style={{ padding: '0 1rem', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
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
            style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                backgroundColor: selected ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontWeight: 500
            }}>
            {label}
        </button>
    );
}
