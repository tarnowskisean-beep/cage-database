"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Batch {
    BatchID: number;
    BatchCode: string;
    ClientCode: string;
    Status: string;
    EntryMode: string;
    Date: string;
}

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
}

export default function BatchesPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const router = useRouter();

    // Load Data
    useEffect(() => {
        fetchBatches();
        fetchClients();
    }, []);

    const fetchBatches = async () => {
        try {
            const res = await fetch('/api/batches');
            if (res.ok) setBatches(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/clients');
            if (res.ok) setClients(await res.json());
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Batches</h1>
                    <p style={{ color: 'hsl(var(--color-text-muted))' }}>Manage and process donation batches</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    + New Batch
                </button>
            </header>

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
                    <div style={{ color: 'hsl(var(--color-text-muted))', textAlign: 'center', padding: '2rem' }}>No batches found. Create one to get started.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid hsla(var(--color-border), 0.5)', color: 'hsl(var(--color-text-muted))' }}>
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
    const [formData, setFormData] = useState({
        clientId: '',
        entryMode: 'Barcode',
        paymentCategory: 'Checks',
        zerosType: ''
    });

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
                alert('Error creating batch');
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
            <div className="glass-panel" style={{ width: '500px', padding: '2rem', backgroundColor: 'hsl(var(--color-bg-surface))' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Start New Batch</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Entry Mode</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {['Barcode', 'Datamatrix', 'Manual', 'ZerosOCR'].map(mode => (
                                <ModeOption
                                    key={mode}
                                    label={mode}
                                    selected={formData.entryMode === mode}
                                    onClick={() => setFormData({ ...formData, entryMode: mode })}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Category</label>
                        <select
                            className="input-field"
                            value={formData.paymentCategory}
                            onChange={e => setFormData({ ...formData, paymentCategory: e.target.value })}
                        >
                            <option>Checks</option>
                            <option>Credit Card</option>
                            <option>EFT</option>
                            <option>Mixed</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Batch'}
                        </button>
                        <button
                            style={{ flex: 1, background: 'transparent', border: '1px solid hsl(var(--color-border))', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
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

function StatCard({ label, value, icon }: { label: string, value: string, icon: string }) {
    return (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
                <div style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.875rem' }}>{label}</div>
            </div>
        </div>
    );
}

function BatchRow({ batch }: { batch: Batch }) {
    return (
        <tr style={{ borderBottom: '1px solid hsla(var(--color-border), 0.2)' }}>
            <td style={{ padding: '1rem', fontWeight: 600 }}>{batch.BatchCode}</td>
            <td style={{ padding: '1rem' }}>{batch.ClientCode}</td>
            <td style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))' }}>{new Date(batch.Date).toLocaleDateString()}</td>
            <td style={{ padding: '1rem' }}>
                <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: batch.Status === 'Open' ? 'hsla(140, 60%, 40%, 0.2)' : 'hsla(220, 20%, 30%, 0.5)',
                    color: batch.Status === 'Open' ? '#4ade80' : 'hsl(var(--color-text-muted))'
                }}>
                    {batch.Status}
                </span>
            </td>
            <td style={{ padding: '1rem' }}>{batch.EntryMode}</td>
            <td style={{ padding: '1rem' }}>
                <Link href={`/batches/${batch.BatchID}/enter`} style={{ color: 'hsl(var(--color-primary))', textDecoration: 'none', fontWeight: 500 }}>
                    Open &rarr;
                </Link>
            </td>
        </tr>
    );
}

function ModeOption({ label, selected, onClick }: { label: string, selected?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${selected ? 'hsl(var(--color-primary))' : 'hsl(var(--color-border))'}`,
                backgroundColor: selected ? 'hsla(var(--color-primary), 0.1)' : 'transparent',
                color: selected ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-muted))',
                cursor: 'pointer',
                fontWeight: 500
            }}>
            {label}
        </button>
    );
}
