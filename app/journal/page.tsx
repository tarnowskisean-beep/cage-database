'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JOURNAL_HEADERS } from '@/lib/journal-mapper'; // We can't import server code here but headers are static

export default function JournalPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    // Filters
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedClient, setSelectedClient] = useState('All');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // 1st of month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date(); // Today
        return d.toISOString().split('T')[0];
    });

    // Data
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        fetch('/api/settings/export-templates').then(r => r.json()).then(setTemplates).catch(console.error);
        fetch('/api/clients').then(r => r.json()).then(setClients).catch(console.error);
    }, []);

    const handleSearch = async () => {
        if (!selectedTemplate) {
            alert('Please select a template');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/journal/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: selectedTemplate,
                    clientId: selectedClient,
                    startDate,
                    endDate
                })
            });
            const data = await res.json();
            setRows(data.rows || []);
            setFetched(true);
        } catch (e) {
            console.error(e);
            alert('Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totalDebits = rows.reduce((sum, r) => sum + (parseFloat(r.Debits) || 0), 0);
    const totalCredits = rows.reduce((sum, r) => sum + (parseFloat(r.Credits) || 0), 0);

    const formatCurrency = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const HEADERS = [
        'JournalNo', 'JournalDate', 'AccountName', 'Debits', 'Credits',
        'Description', 'Name', 'Location', 'Class'
    ]; // Subset for display

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="mb-8">
                <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Accounting</h2>
                <h1 className="text-4xl text-white font-display">Journal Ledger</h1>
            </header>

            {/* Controls */}
            <div className="glass-panel p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1">View Template</label>
                    <select
                        className="input-field bg-zinc-900/50 border-white/10 w-[200px]"
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                    >
                        <option value="">-- Select Template --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1">Client</label>
                    <select
                        className="input-field bg-zinc-900/50 border-white/10 w-[150px]"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                    >
                        <option value="All">All Clients</option>
                        {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs uppercase text-gray-500 mb-1">Date Range</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            className="input-field bg-zinc-900/50 border-white/10 w-[140px]"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                        <input
                            type="date"
                            className="input-field bg-zinc-900/50 border-white/10 w-[140px]"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !selectedTemplate}
                    className="btn-primary h-[42px] px-6"
                >
                    {loading ? 'Loading...' : 'View Ledger'}
                </button>
            </div>

            {/* Results */}
            {fetched && (
                <div className="glass-panel animate-in fade-in duration-500">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/30">
                        <div className="text-sm text-gray-400">
                            Showing <span className="text-white font-mono">{rows.length}</span> rows
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase text-gray-500 font-bold">Total Debits</span>
                                <span className="text-emerald-400 font-mono font-medium">${formatCurrency(totalDebits)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase text-gray-500 font-bold">Total Credits</span>
                                <span className="text-emerald-400 font-mono font-medium">${formatCurrency(totalCredits)}</span>
                            </div>
                            <div className="flex flex-col items-end border-l border-white/10 pl-6">
                                <span className="text-[10px] uppercase text-gray-500 font-bold">Net Balance</span>
                                <span className={`font-mono font-medium ${Math.abs(totalDebits - totalCredits) < 0.01 ? 'text-gray-400' : 'text-red-500'}`}>
                                    ${formatCurrency(totalDebits - totalCredits)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    {HEADERS.map(h => (
                                        <th key={h} className={`px-4 py-3 font-medium ${h === 'Debits' || h === 'Credits' ? 'text-right' : ''}`}>
                                            {h.replace(/([A-Z])/g, ' $1').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={HEADERS.length} className="px-4 py-12 text-center text-gray-500">
                                            No rows generated. Check your filters or template.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            {HEADERS.map(col => (
                                                <td key={col} className={`px-4 py-2 text-gray-300 font-light whitespace-nowrap ${col === 'Debits' || col === 'Credits' ? 'text-right font-mono text-white' : ''} ${col === 'JournalNo' ? 'font-mono text-xs text-gray-500' : ''}`}>
                                                    {col === 'Debits' || col === 'Credits' ? (row[col] ? formatCurrency(parseFloat(row[col])) : '-') : row[col]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
