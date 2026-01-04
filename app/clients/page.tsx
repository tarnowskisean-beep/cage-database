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
                const formData = new FormData();
                formData.append('id', String(editingClient.ClientID));
                formData.append('name', newClient.name);
                formData.append('clientType', newClient.clientType);
                if (logoFile) {
                    formData.append('logo', logoFile);
                }
                body = formData;
            } else {
                body = JSON.stringify(newClient);
                headers = { 'Content-Type': 'application/json' };
            }

            const res = await fetch(url, { method, headers, body });

            if (res.ok) {
                setNewClient({ code: '', name: '', logoUrl: '', clientType: '' });
                setLogoFile(null);
                setEditingClient(null);
                setIsModalOpen(false);
                fetchClients();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="page-header mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-display font-bold text-white mb-2 drop-shadow-md">Client Directory</h1>
                    <p className="text-gray-400 font-light">Manage and view all registered clients</p>
                </div>
                <button
                    onClick={openCreate}
                    className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg hover:shadow-xl transition-all"
                >
                    <span className="text-xl leading-none">+</span> New Client
                </button>
            </header>

            <div className="glass-panel p-0 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse">
                        <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <div>Loading Clients...</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.ClientID} className="group transition-colors">
                                    <td className="font-mono font-semibold text-blue-300 group-hover:text-blue-200">{client.ClientCode}</td>
                                    <td className="font-medium text-white">{client.ClientName}</td>
                                    <td className="text-gray-400">{client.ClientType || '-'}</td>
                                    <td className="flex gap-2">
                                        <button
                                            onClick={() => openEdit(client)}
                                            className="px-3 py-1.5 text-xs font-medium border border-gray-600 rounded-md hover:border-white/50 hover:text-white text-gray-400 transition-colors"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            title="Upload Finder File CSV"
                                            onClick={() => setImportClient(client)}
                                            className="px-3 py-1.5 text-xs font-medium border border-blue-500/50 text-blue-400 rounded-md hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <span>📤</span> Import File
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-gray-500 italic">
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
                    <div className="glass-panel w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold font-display text-white mb-6">
                            {editingClient ? 'Edit Client' : 'Add New Client'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block mb-2 font-medium text-gray-400 text-xs uppercase tracking-wide">Client Code</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. ABC"
                                    value={newClient.code}
                                    onChange={e => setNewClient({ ...newClient, code: e.target.value.toUpperCase() })}
                                    required
                                    maxLength={10}
                                    disabled={!!editingClient}
                                    style={{ opacity: editingClient ? 0.7 : 1 }}
                                />
                            </div>

                            <div>
                                <label className="block mb-2 font-medium text-gray-400 text-xs uppercase tracking-wide">Client Name</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. American Bird Conservancy"
                                    value={newClient.name}
                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-2 font-medium text-gray-400 text-xs uppercase tracking-wide">Client Type</label>
                                <div className="space-y-2">
                                    <select
                                        className="input-field"
                                        value={['501c3', '501c4', '527'].includes(newClient.clientType) ? newClient.clientType : '__OTHER__'}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val !== '__OTHER__') setNewClient({ ...newClient, clientType: val });
                                            else setNewClient({ ...newClient, clientType: '' });
                                        }}
                                    >
                                        <option value="">Select Type...</option>
                                        <option value="501c3">501c3</option>
                                        <option value="501c4">501c4</option>
                                        <option value="527">527</option>
                                        <option value="__OTHER__">Other (Enter below)</option>
                                    </select>

                                    {!['501c3', '501c4', '527'].includes(newClient.clientType) && (
                                        <input
                                            className="input-field"
                                            placeholder="Type custom client type..."
                                            value={newClient.clientType}
                                            onChange={e => setNewClient({ ...newClient, clientType: e.target.value })}
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 font-medium text-gray-400 text-xs uppercase tracking-wide">Organization Logo</label>
                                {editingClient ? (
                                    <div className="bg-black/20 p-4 rounded-lg border border-[var(--glass-border)]">
                                        {newClient.logoUrl && !logoFile && (
                                            <div className="mb-4 flex justify-center bg-white/5 p-4 rounded">
                                                <img src={newClient.logoUrl} alt="Current Logo" className="h-12 object-contain" />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
                                            onChange={e => setLogoFile(e.target.files?.[0] || null)}
                                        />
                                        <p className="text-xs text-gray-500 mt-2 italic">
                                            Upload an image to replace the current logo.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic bg-black/20 p-3 rounded border border-dashed border-gray-700">
                                        Save the client first, then edit to upload a logo.
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-[var(--glass-border)]">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-white/5 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary flex-1 py-3 text-lg shadow-lg hover:shadow-blue-500/20"
                                >
                                    {submitting ? 'Saving...' : (editingClient ? 'Update Client' : 'Create Client')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {importClient && <ImportFinderFileModal client={importClient} onClose={() => setImportClient(null)} />}
        </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
            <div className="glass-panel w-full max-w-lg p-8">
                <h3 className="text-xl font-bold font-display text-white mb-2">Import Finder File</h3>
                <p className="mb-6 text-sm text-gray-400">
                    Upload a CSV for <strong className="text-white bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">{client.ClientCode}</strong>
                </p>

                <div className="bg-black/20 p-6 rounded-lg border border-[var(--glass-border)] mb-6 text-center">
                    <a
                        href={url}
                        download="finder_template.csv"
                        className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium mb-4"
                    >
                        <span>⬇</span> Download CSV Template
                    </a>

                    <input
                        type="file"
                        accept=".csv"
                        className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2.5 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-emerald-500/10 file:text-emerald-400
                        hover:file:bg-emerald-500/20
                        cursor-pointer"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>

                <div className="flex gap-4">
                    <button className="btn-primary flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500" onClick={handleUpload} disabled={uploading || !file}>
                        {uploading ? 'Importing...' : 'Upload CSV'}
                    </button>
                    <button
                        className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
