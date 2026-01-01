"use client";

import { useEffect, useState } from 'react';

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchClients();
    }, []);

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Client Directory</h1>
                    <p style={{ color: 'hsl(var(--color-text-muted))' }}>Manage and view all registered clients</p>
                </div>
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
        </div>
    );
}
