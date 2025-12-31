"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function BatchesPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);

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
                <StatCard label="Open Batches" value="3" icon="📂" />
                <StatCard label="Pending Review" value="12" icon="👀" />
                <StatCard label="Today's Volume" value="$45,230" icon="💰" />
            </div>

            {/* Batch List */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Active Batches</h3>
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
                        <BatchRow id="AG.04" client="AFL" created="10:42 AM" status="Open" mode="Barcode" />
                        <BatchRow id="AG.03" client="CAND001" created="09:15 AM" status="Submitted" mode="Manual" />
                        <BatchRow id="JD.01" client="AFL" created="Yesterday" status="Closed" mode="Datamatrix" />
                    </tbody>
                </table>
            </div>

            {/* Mock Modal for Create Batch */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '2rem', backgroundColor: 'hsl(var(--color-bg-surface))' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Start New Batch</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client</label>
                                <select className="input-field">
                                    <option>Select Client...</option>
                                    <option>AFL - American Freedom League</option>
                                    <option>CAND001 - Candidate One</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Entry Mode</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <ModeOption label="Barcode" selected />
                                    <ModeOption label="Datamatrix" />
                                    <ModeOption label="Manual" />
                                    <ModeOption label="Zeros (OCR)" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Category</label>
                                <select className="input-field">
                                    <option>Checks</option>
                                    <option>Credit Card</option>
                                    <option>EFT</option>
                                    <option>Mixed</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.location.href = '/batches/123/enter'}>
                                    Create Batch
                                </button>
                                <button
                                    style={{ flex: 1, background: 'transparent', border: '1px solid hsl(var(--color-border))', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

function BatchRow({ id, client, created, status, mode }: any) {
    return (
        <tr style={{ borderBottom: '1px solid hsla(var(--color-border), 0.2)' }}>
            <td style={{ padding: '1rem', fontWeight: 600 }}>{id}</td>
            <td style={{ padding: '1rem' }}>{client}</td>
            <td style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))' }}>{created}</td>
            <td style={{ padding: '1rem' }}>
                <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: status === 'Open' ? 'hsla(140, 60%, 40%, 0.2)' : 'hsla(220, 20%, 30%, 0.5)',
                    color: status === 'Open' ? '#4ade80' : 'hsl(var(--color-text-muted))'
                }}>
                    {status}
                </span>
            </td>
            <td style={{ padding: '1rem' }}>{mode}</td>
            <td style={{ padding: '1rem' }}>
                <Link href={`/batches/${id}/enter`} style={{ color: 'hsl(var(--color-primary))', textDecoration: 'none', fontWeight: 500 }}>
                    Open &rarr;
                </Link>
            </td>
        </tr>
    );
}

function ModeOption({ label, selected }: { label: string, selected?: boolean }) {
    return (
        <button style={{
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
