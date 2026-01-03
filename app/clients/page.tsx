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
    const [importClient, setImportClient] = useState<Client | null>(null);

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
                    <p style={{ color: 'var(--color-text-muted)' }}>Manage and view all registered clients</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary"
                    style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <span>+</span> New Client
                </button>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading Clients...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Code</th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.ClientID} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-active)' }}>{client.ClientCode}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--color-text-main)' }}>{client.ClientName}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{client.ClientType || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <button
                                            title="Upload Finder File CSV (CagingID, Name, Address...)"
                                            onClick={() => setImportClient(client)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid var(--color-primary)',
                                                color: 'var(--color-primary)',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            📤 Import File
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No clients found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
                    }}>
                        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>Add New Client</h2>
                            <form onSubmit={handleCreate}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Client Code</label>
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
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Client Name</label>
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
                                        style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '0.5rem 1rem', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn-primary"
                                        style={{ padding: '0.5rem 1.5rem' }}
                                    >
                                        {submitting ? 'Saving...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {importClient && <ImportFinderFileModal client={importClient} onClose={() => setImportClient(null)} />}
        </div >
    );
}

function ImportFinderFileModal({ client, onClose }: { client: Client, onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/clients/${client.ClientID}/import`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Imported ${data.count} records. (Skipped: ${data.skipped})`);
                onClose();
            } else {
                alert('Import failed: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Upload error');
        } finally {
            setUploading(false);
        }
    };

    const templateCsv = "CagingID,MailerID,MailCode,FirstName,LastName,Address,City,State,Zip";
    const blob = new Blob([templateCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '500px', padding: '2rem', backgroundColor: 'hsl(var(--color-bg-surface))' }}>
                <h3 style={{ marginBottom: '1rem' }}>Import Finder File</h3>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Upload a CSV for <strong>{client.ClientCode}</strong>.
                </p>

                <a
                    href={url}
                    download="finder_template.csv"
                    style={{ display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#4ade80', textDecoration: 'underline' }}
                >
                    ⬇ Download CSV Template
                </a>

                <input
                    type="file"
                    accept=".csv"
                    className="input-field"
                    style={{ marginBottom: '1.5rem' }}
                    onChange={e => setFile(e.target.files?.[0] || null)}
                />

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpload} disabled={uploading || !file}>
                        {uploading ? 'Importing...' : 'Upload CSV'}
                    </button>
                    <button
                        style={{ flex: 1, background: 'transparent', border: '1px solid hsl(var(--color-border))', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
