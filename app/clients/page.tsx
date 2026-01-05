/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { Suspense, useState, useEffect } from 'react';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null); // If null, creating new

    // Import Logic
    const [showImportModal, setShowImportModal] = useState(false);
    const [importingClient, setImportingClient] = useState<any>(null);

    const refreshClients = () => {
        setLoading(true);
        // Prevent caching of old empty lists
        fetch('/api/clients', { cache: 'no-store' })
            .then(async res => {
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setClients(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load clients:", err);
                setLoading(false); // Ensure loading stops even on error
            });
    };

    useEffect(() => {
        refreshClients();
    }, []);

    const handleEdit = (client: any) => {
        setEditingClient(client);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingClient(null);
        setShowModal(true);
    };

    const handleImport = (client: any) => {
        setImportingClient(client);
        setShowImportModal(true);
    };

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Administration</h2>
                    <h1 className="text-4xl text-white font-display">Client Management</h1>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn-primary"
                >
                    + Add Client
                </button>
            </header>

            {/* Clients Grid/Table */}
            <div className="glass-panel overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse text-xs uppercase tracking-widest">Loading Client Data...</div>
                ) : clients.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">No clients found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-16">Icon</th>
                                    <th>Code</th>
                                    <th>Official Name</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(client => (
                                    <tr key={client.ClientID} className="group">
                                        <td>
                                            <div className="w-8 h-8 rounded bg-white overflow-hidden flex items-center justify-center border border-gray-700">
                                                {client.LogoURL ? (
                                                    <img src={client.LogoURL} alt={client.ClientCode} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-black font-bold text-[10px] tracking-tighter">{client.ClientCode?.substring(0, 3)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-medium text-white">{client.ClientCode}</td>
                                        <td className="text-gray-300">{client.ClientName}</td>
                                        <td className="text-gray-500 text-xs">
                                            <span className="uppercase tracking-wider">{client.ClientType || '-'}</span>
                                        </td>
                                        <td>
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium
                                                ${client.Status === 'Active'
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                                    : 'border-zinc-700 bg-zinc-800 text-gray-500'}
                                            `}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${client.Status === 'Active' ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                                                {client.Status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="text-right flex items-center justify-end gap-3 py-4 pr-6">
                                            <button
                                                onClick={() => handleImport(client)}
                                                className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wide transition-colors flex items-center gap-1"
                                                title="Import Finder File"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                Import
                                            </button>
                                            <div className="w-px h-3 bg-gray-700"></div>
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wide transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <ClientModal
                    client={editingClient}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        refreshClients();
                    }}
                />
            )}

            {showImportModal && importingClient && (
                <ImportFinderModal
                    client={importingClient}
                    onClose={() => setShowImportModal(false)}
                />
            )}
        </div>
    );
}

// Import Finder File Modal
function ImportFinderModal({ client, onClose }: { client: any, onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const downloadTemplate = () => {
        const headers = ['CagingID', 'MailerID', 'MailCode', 'FirstName', 'LastName', 'Address', 'City', 'State', 'Zip'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "finder_file_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/clients/${client.ClientID}/import`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, count: data.count, skipped: data.skipped });
                setFile(null); // Clear file after success
            } else {
                setResult({ success: false, error: data.error });
            }
        } catch (err) {
            setResult({ success: false, error: 'Network Error' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="glass-panel w-full max-w-lg p-8 border border-white/10 bg-[#09090b]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-display text-white">Import Finder File</h2>
                        <p className="text-gray-500 text-xs mt-1">Target: <span className="text-white font-bold">{client.ClientCode}</span> ({client.ClientName})</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
                </div>

                {!result ? (
                    <form onSubmit={handleUpload} className="space-y-6">
                        {/* INSTRUCTIONS */}
                        <div className="bg-white/5 rounded-md p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Instructions</h4>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                    <span>⬇</span> Download Template
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                                PROSPECTS will be matched/updated based on <b>CagingID</b>. New records will be inserted.
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {['CagingID', 'MailerID', 'MailCode', 'First', 'Last', 'Address', 'City', 'State', 'Zip'].map(h => (
                                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-gray-400 font-mono">
                                        {h}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="text-emerald-400 font-bold text-sm break-all">
                                    📄 {file.name}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    <span className="block text-2xl mb-2">📥</span>
                                    <span>Click to upload CSV</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="btn-primary"
                            >
                                {uploading ? 'Importing...' : 'Start Import'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-4">
                        {result.success ? (
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✓</div>
                                <h3 className="text-white font-bold mb-1">Import Successful</h3>
                                <p className="text-gray-400 text-sm">
                                    Processed <span className="text-white">{result.count}</span> records.
                                    {result.skipped > 0 && <span className="block text-xs text-orange-400 mt-1">Skipped {result.skipped} invalid rows.</span>}
                                </p>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✕</div>
                                <h3 className="text-white font-bold mb-1">Import Failed</h3>
                                <p className="text-red-400 text-sm">{result.error}</p>
                            </div>
                        )}
                        <button
                            onClick={result.success ? onClose : () => setResult(null)}
                            className="btn-primary w-full"
                        >
                            {result.success ? 'Done' : 'Try Again'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Client Modal with Logo & Status Support
function ClientModal({ client, onClose, onSuccess }: { client: any, onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: client?.ClientName || '',
        code: client?.ClientCode || '',
        clientType: client?.ClientType || 'c3',
        status: client?.Status || 'Active',
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(client?.LogoURL || null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            const url = client ? `/api/clients/${client.ClientID}` : '/api/clients';
            const method = client ? 'PUT' : 'POST';

            // Use FormData for file upload
            const data = new FormData();
            if (client) data.append('id', client.ClientID);
            data.append('name', formData.name);
            data.append('code', formData.code);
            data.append('clientType', formData.clientType);
            data.append('status', formData.status);
            if (logoFile) data.append('logo', logoFile);

            const res = await fetch(url, {
                method,
                body: client || logoFile ? data : JSON.stringify(formData),
                headers: client || logoFile ? {} : { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to save client');

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Error saving client');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="glass-panel w-full max-w-lg p-8 border border-white/10 bg-[#09090b]">
                <h2 className="text-2xl font-display text-white mb-6">
                    {client ? 'Edit Client' : 'New Client'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client Code</label>
                            <input
                                type="text"
                                className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                required
                                maxLength={10}
                                disabled={!!client} // Code is immutable after creation usually
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Status</label>
                            <select
                                className="input-field cursor-pointer bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Official Name</label>
                        <input
                            type="text"
                            className="input-field bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client Type</label>
                        <select
                            className="input-field cursor-pointer bg-zinc-900/50 border-white/10 focus:border-white/30 hover:border-white/20 transition-colors"
                            value={formData.clientType}
                            onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                        >
                            <option value="c3">501(c)(3) Non-Profit</option>
                            <option value="c4">501(c)(4) Social Welfare</option>
                            <option value="PAC">Political Action Committee (PAC)</option>
                            <option value="Unknown">Unknown / Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client Logo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-500">No Logo</span>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-white/10 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded bg-transparent border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-xs font-bold uppercase tracking-widest"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn-primary"
                            disabled={uploading}
                        >
                            {uploading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
