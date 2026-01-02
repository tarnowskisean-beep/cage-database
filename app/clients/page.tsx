"use client";

import { useEffect, useState } from 'react';

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
    ClientType?: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({ code: '', name: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/clients');
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (error) {
            console.error('Failed to fetch clients', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClient)
            });

            if (res.ok) {
                setNewClient({ code: '', name: '' });
                setIsModalOpen(false);
                fetchClients(); // Refresh list
            } else {
                alert('Failed to create client');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating client');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Client Directory</h1>
                    <p style={{ color: 'hsl(var(--color-text-muted))' }}>Manage and view all registered clients</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="button-primary"
                    style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <span>+</span> New Client
                </button>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))' }}>Loading Clients...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid hsla(var(--color-border), 0.3)' }}>
                                <th style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>ID</th>
                                <th style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>Code</th>
                                <th style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>Name</th>
                                <th style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>Type</th>
                                <th style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.ClientID} style={{ borderBottom: '1px solid hsla(var(--color-border), 0.1)' }}>
                                    <td style={{ padding: '1rem' }}>{client.ClientID}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600, color: '#4ade80' }}>
                                        {client.ClientCode}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{client.ClientName}</td>
                                    <td style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))' }}>{client.ClientType || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            background: 'hsla(140, 60%, 40%, 0.2)',
                                            color: '#4ade80',
                                            fontSize: '0.875rem'
                                        }}>
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))' }}>
                                        No clients found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Add New Client</h2>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'hsl(var(--color-text-muted))' }}>Client Code</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. ABC"
                                    value={newClient.code}
                                    onChange={e => setNewClient({ ...newClient, code: e.target.value.toUpperCase() })}
                                    required
                                    maxLength={10}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'hsl(var(--color-text-muted))' }}>Client Name</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. American Bird Conservancy"
                                    value={newClient.name}
                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ background: 'transparent', border: '1px solid hsla(var(--color-border), 0.5)', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="button-primary"
                                    style={{ padding: '0.5rem 1.5rem' }}
                                >
                                    {submitting ? 'Saving...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
