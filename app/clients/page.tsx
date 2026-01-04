'use client';

import { Suspense, useState, useEffect } from 'react';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null); // If null, creating new

    const refreshClients = () => {
        setLoading(true);
        fetch('/api/clients')
            .then(res => res.json())
            .then(data => {
                setClients(data);
                setLoading(false);
            })
            .catch(console.error);
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
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(client => (
                                    <tr key={client.ClientID} className="group">
                                        <td>
                                            <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold text-xs">
                                                {client.ClientCode?.substring(0, 2)}
                                            </div>
                                        </td>
                                        <td className="font-medium text-white">{client.ClientCode}</td>
                                        <td className="text-gray-300">{client.ClientName}</td>
                                        <td className="text-gray-500 text-xs">
                                            {client.ContactEmail || '-'}
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-xs text-gray-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Active
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

function ClientModal({ client, onClose, onSuccess }: { client: any, onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        ClientCode: client?.ClientCode || '',
        ClientName: client?.ClientName || '',
        ContactEmail: client?.ContactEmail || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = client ? `/api/clients/${client.ClientID}` : '/api/clients';
        const method = client ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        onSuccess();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="glass-panel w-full max-w-md p-8 border border-white/10 bg-[#09090b]">
                <h2 className="text-2xl font-display text-white mb-6">
                    {client ? 'Edit Client' : 'New Client'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Client Code</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.ClientCode}
                            onChange={e => setFormData({ ...formData, ClientCode: e.target.value })}
                            required
                            maxLength={10}
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Official Name</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.ClientName}
                            onChange={e => setFormData({ ...formData, ClientName: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Contact Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={formData.ContactEmail}
                            onChange={e => setFormData({ ...formData, ContactEmail: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                        <button type="submit" className="flex-1 btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
