'use client';

import { Suspense, useState, useEffect } from 'react';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null); // If null, creating new

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
                                                    <span className="text-black font-bold text-xs">{client.ClientCode?.substring(0, 2)}</span>
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
                                        <td className="text-right">
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
                                className="input-field"
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
                                className="input-field cursor-pointer"
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
                            className="input-field"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client Type</label>
                        <select
                            className="input-field cursor-pointer"
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
                                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={uploading}>Cancel</button>
                        <button type="submit" className="flex-1 btn-primary" disabled={uploading}>
                            {uploading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
