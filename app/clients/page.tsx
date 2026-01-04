"use client";

import { useEffect, useState } from 'react';

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
    ClientType?: string;
    LogoURL?: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({ code: '', name: '', logoUrl: '', clientType: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [importClient, setImportClient] = useState<Client | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingClient ? '/api/clients' : '/api/clients';
            const method = editingClient ? 'PUT' : 'POST';

            let body: any;
            let headers: any = {};

            if (editingClient) {
                // Use FormData for updates (supports file upload)
                const formData = new FormData();
                formData.append('id', String(editingClient.ClientID));
                formData.append('name', newClient.name);
                formData.append('clientType', newClient.clientType);
                if (logoFile) {
                    formData.append('logo', logoFile);
                }
                body = formData;
                // No Content-Type header needed for FormData, browser sets it with boundary
            } else {
                // Use JSON for creation (simple)
                body = JSON.stringify(newClient);
                headers = { 'Content-Type': 'application/json' };
            }

            const res = await fetch(url, { method, headers, body });

            if (res.ok) {
                setNewClient({ code: '', name: '', logoUrl: '', clientType: '' });
                setLogoFile(null);
                setEditingClient(null);
                setIsModalOpen(false);
                fetchClients(); // Refresh list
            } else {
                alert('Failed to save client');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving client');
        } finally {
            setSubmitting(false);
        }
    };

    const openCreate = () => {
        setEditingClient(null);
        setNewClient({ code: '', name: '', logoUrl: '', clientType: '' });
        setIsModalOpen(true);
    };

    const openEdit = (client: Client) => {
        setEditingClient(client);
        setNewClient({
            code: client.ClientCode,
            name: client.ClientName,
            logoUrl: client.LogoURL || '',
            clientType: client.ClientType || ''
        });
        setIsModalOpen(true);
    };

    return (
        <div>
            <header className="page-header mb-8">
                <div>
                    <h1 className="text-3xl font-display text-white mb-2">Client Directory</h1>
                    <p className="text-gray-400">Manage and view all registered clients</p>
                </div>
                <button
                    onClick={openCreate}
                    className="btn-primary flex items-center gap-2 px-6 py-3"
                >
                    <span>+</span> New Client
                </button>
            </header>

            <div className="glass-panel p-0 bg-[#1a1a1a] overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading Clients...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Code</th>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Type</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {clients.map(client => (
                                <tr key={client.ClientID} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-mono font-semibold text-[var(--color-accent)]">{client.ClientCode}</td>
                                    <td className="p-4 font-medium text-white">{client.ClientName}</td>
                                    <td className="p-4 text-gray-500">{client.ClientType || '-'}</td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => openEdit(client)}
                                            className="px-3 py-1 text-sm border border-gray-700 rounded hover:border-gray-500 hover:text-white transition-colors"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            title="Upload Finder File CSV (CagingID, Name, Address...)"
                                            onClick={() => setImportClient(client)}
                                            className="px-3 py-1 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                                        >
                                            📤 Import File
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
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
                            <h2 style={{ marginBottom: '1.5rem' }}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                            <form onSubmit={handleSave}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Client Code</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. ABC"
                                        value={newClient.code}
                                        onChange={e => setNewClient({ ...newClient, code: e.target.value.toUpperCase() })}
                                        required
                                        maxLength={10}
                                        disabled={!!editingClient} // Code is immutable
                                        style={{ opacity: editingClient ? 0.7 : 1 }}
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
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Client Type</label>
                                    <select
                                        className="input-field"
                                        value={newClient.clientType} // Simple select for now, can make creatable if needed or add 'Other'
                                        onChange={e => {
                                            setNewClient({ ...newClient, clientType: e.target.value });
                                        }}
                                        style={{ marginBottom: '0.5rem' }}
                                    >
                                        <option value="">Select Type...</option>
                                        <option value="501c3">501c3</option>
                                        <option value="501c4">501c4</option>
                                        <option value="527">527</option>
                                        <option value="__OTHER__">Other (Enter below)</option>
                                    </select>
                                    {/* Simplified custom entry: always show input if value is not in standard list or if user types */}
                                    <input
                                        className="input-field"
                                        placeholder="Or type custom..."
                                        value={newClient.clientType}
                                        onChange={e => setNewClient({ ...newClient, clientType: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Organization Logo</label>
                                    {editingClient ? (
                                        <>
                                            {newClient.logoUrl && !logoFile && (
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                    <img src={newClient.logoUrl} alt="Current Logo" style={{ height: '50px', objectFit: 'contain' }} />
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="input-field"
                                                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                            />
                                            <p style={{ fontSize: '0.8em', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                                Upload an image to replace the current logo.
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                            Save the client first, then edit to upload a logo.
                                        </p>
                                    )}
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
                                        {submitting ? 'Saving...' : (editingClient ? 'Update' : 'Create')}
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

    const templateCsv = "CagingID,MailCode,FirstName,LastName,Address,City,State,Zip";
    const blob = new Blob([templateCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
            <div className="glass-panel w-[500px] p-8 bg-[#1a1a1a]">
                <h3 className="text-xl font-bold text-white mb-4">Import Finder File</h3>
                <p className="mb-2 text-sm text-gray-400">
                    Upload a CSV for <strong className="text-white">{client.ClientCode}</strong>.
                </p>

                <a
                    href={url}
                    download="finder_template.csv"
                    className="inline-block mb-6 text-xs text-[var(--color-success)] underline hover:text-green-300"
                >
                    ⬇ Download CSV Template
                </a>

                <input
                    type="file"
                    accept=".csv"
                    className="input-field w-full mb-6 bg-[#111] border border-gray-700 p-2 rounded text-sm text-gray-300"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                />

                <div className="flex gap-4">
                    <button className="btn-primary flex-1 py-2" onClick={handleUpload} disabled={uploading || !file}>
                        {uploading ? 'Importing...' : 'Upload CSV'}
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
    );
}
