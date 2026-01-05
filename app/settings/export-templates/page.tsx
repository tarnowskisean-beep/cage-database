"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
    id: number;
    name: string;
    mappings: RowDefinition[];
}

interface RowDefinition {
    id: string; // internal ID for React keys
    JournalNo: string;
    JournalDate: string;
    AccountName: string;
    Debits: string;
    Credits: string;
    Description: string;
    Name: string;
    Currency: string;
    Location: string;
    Class: string;
}

const TARGET_COLUMNS = [
    'JournalNo', 'JournalDate', 'AccountName', 'Debits', 'Credits',
    'Description', 'Name', 'Currency', 'Location', 'Class'
];

const DB_FIELDS = [
    '{BatchCode}', '{Date}', '{Amount}', '{DonorName}', '{PaymentMethod}',
    '{CheckNumber}', '{Platform}', '{Fund}', '{Campaign}', '{TransactionType}'
];

export default function ExportTemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/settings/export-templates')
            .then(res => res.json())
            .then(setTemplates)
            .catch(console.error);
    }, []);

    const handleCreate = () => {
        setEditingTemplate({
            id: 0,
            name: 'New Template',
            mappings: [createEmptyRow()]
        });
    };

    const createEmptyRow = (): RowDefinition => ({
        id: Math.random().toString(36).substr(2, 9),
        JournalNo: '{BatchCode}',
        JournalDate: '{Date}',
        AccountName: '',
        Debits: '',
        Credits: '',
        Description: 'Donation from {DonorName}',
        Name: '{DonorName}',
        Currency: 'USD',
        Location: '',
        Class: ''
    });

    const handleSave = async () => {
        if (!editingTemplate) return;
        setLoading(true);
        try {
            const method = editingTemplate.id === 0 ? 'POST' : 'PUT';
            const url = editingTemplate.id === 0
                ? '/api/settings/export-templates'
                : `/api/settings/export-templates/${editingTemplate.id}`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTemplate)
            });

            if (res.ok) {
                const saved = await res.json();
                setTemplates(prev => editingTemplate.id === 0 ? [saved, ...prev] : prev.map(t => t.id === saved.id ? saved : t));
                setEditingTemplate(null);
            } else {
                alert('Error saving template');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this template?')) return;
        await fetch(`/api/settings/export-templates/${id}`, { method: 'DELETE' });
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h1 className="text-2xl font-bold text-white">Export Templates (Journal Entries)</h1>
                <button onClick={handleCreate} className="btn-primary">
                    + Create Template
                </button>
            </div>

            {editingTemplate ? (
                <div className="glass-panel p-6">
                    <div className="flex justify-between items-center mb-6">
                        <input
                            className="text-xl font-bold bg-transparent border-b border-gray-700 text-white w-1/2 p-2 focus:border-white outline-none"
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            placeholder="Template Name"
                        />
                        <div className="space-x-4">
                            <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={handleSave} disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-white">Row Definitions</h3>
                            <button
                                onClick={() => setEditingTemplate({
                                    ...editingTemplate,
                                    mappings: [...editingTemplate.mappings, createEmptyRow()]
                                })}
                                className="text-xs uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded"
                            >
                                + Add Row
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Define the rows generated for EACH transaction. Use <code>{'{Field}'}</code> for dynamic data.
                        </p>

                        {editingTemplate.mappings.map((row, idx) => (
                            <div key={row.id} className="bg-zinc-900/50 p-4 rounded border border-white/5 relative">
                                <div className="absolute top-2 right-2 text-xs font-mono text-gray-600">ROW #{idx + 1}</div>
                                <button
                                    className="absolute top-2 right-12 text-red-500 hover:text-red-400 text-xs"
                                    onClick={() => setEditingTemplate({
                                        ...editingTemplate,
                                        mappings: editingTemplate.mappings.filter((_, i) => i !== idx)
                                    })}
                                >
                                    REMOVE
                                </button>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {TARGET_COLUMNS.map(col => (
                                        <div key={col}>
                                            <label className="block text-[10px] uppercase text-gray-500 mb-1">{col}</label>
                                            <div className="relative">
                                                <input
                                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500"
                                                    value={(row as any)[col]}
                                                    onChange={(e) => {
                                                        const newMappings = [...editingTemplate.mappings];
                                                        (newMappings[idx] as any)[col] = e.target.value;
                                                        setEditingTemplate({ ...editingTemplate, mappings: newMappings });
                                                    }}
                                                    list={`options-${col}`}
                                                />
                                                <datalist id={`options-${col}`}>
                                                    {DB_FIELDS.map(f => <option key={f} value={f} />)}
                                                </datalist>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(t => (
                        <div key={t.id} className="glass-panel p-6 hover:border-white/20 transition-colors cursor-pointer" onClick={() => setEditingTemplate(t)}>
                            <h3 className="text-xl font-bold text-white mb-2">{t.name}</h3>
                            <p className="text-sm text-gray-500">{t.mappings.length} Row Definitions</p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    className="text-xs uppercase tracking-widest text-red-500 hover:text-red-400 border border-red-500/30 px-3 py-1 rounded"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-12">
                            No templates found. Create one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
