'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AcknowledgementsPage() {
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const fetchDonations = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterDateStart) params.set('start', filterDateStart);
        if (filterDateEnd) params.set('end', filterDateEnd);

        try {
            const res = await fetch(`/api/people/acknowledgements?${params.toString()}`);
            const data = await res.json();
            setDonations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch acknowledgements', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDonations();
    }, [filterDateStart, filterDateEnd]);

    const handleMarkSent = async (ids: number[], type: 'ThankYou' | 'TaxReceipt') => {
        if (!confirm(`Mark ${ids.length} donation(s) as ${type === 'ThankYou' ? 'Thanked' : 'Receipt Sent'}?`)) return;

        try {
            await fetch('/api/people/acknowledgements/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, type })
            });
            // Refresh
            fetchDonations();
            setSelectedIds(new Set());
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === donations.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(donations.map(d => d.DonationID)));
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex justify-between items-end mb-6">
                <div>
                    {/* <Link href="/people" className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wide mb-2 block">&larr; Back to Directory</Link> */}
                    <h1 className="text-3xl font-display text-white">Outstanding Acknowledgements</h1>
                    <p className="text-gray-400 mt-1">Donations that have not yet been sent a Thank You letter.</p>
                </div>

                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => handleMarkSent(Array.from(selectedIds), 'ThankYou')}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                        >
                            Mark {selectedIds.size} Sent
                        </button>
                    )}
                    <button onClick={fetchDonations} className="btn-secondary">Refresh</button>
                    <button
                        onClick={() => {
                            if (donations.length === 0) return;
                            const headers = ['DonationID', 'Date', 'Amount', 'FirstName', 'LastName', 'Address', 'City', 'State', 'Zip', 'Email', 'Campaign', 'Comment'];
                            const csv = [
                                headers.join(','),
                                ...donations.map(d => [
                                    d.DonationID,
                                    new Date(d.GiftDate).toLocaleDateString(),
                                    d.GiftAmount,
                                    `"${d.FirstName || ''}"`,
                                    `"${d.LastName || ''}"`,
                                    `"${d.Address || ''}"`,
                                    `"${d.City || ''}"`,
                                    `"${d.State || ''}"`,
                                    `"${d.Zip || ''}"`,
                                    d.Email || '',
                                    d.CampaignID || '',
                                    `"${d.Comment || ''}"`
                                ].join(','))
                            ].join('\n');

                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `acknowledgements_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                        className="btn-secondary flex items-center gap-2"
                        disabled={donations.length === 0}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download CSV
                    </button>
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex gap-4 items-center">
                    <span className="text-sm text-gray-400">Filter Date:</span>
                    <input
                        type="date"
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                        value={filterDateStart}
                        onChange={e => setFilterDateStart(e.target.value)}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="date"
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                        value={filterDateEnd}
                        onChange={e => setFilterDateEnd(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse">Loading donations...</div>
                ) : donations.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg text-white mb-2">🎉 All Caught Up!</p>
                        <p>No outstanding acknowledgements found.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/5">
                                <th className="px-6 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded bg-zinc-800 border-zinc-600 focus:ring-emerald-500 text-emerald-500"
                                        checked={donations.length > 0 && selectedIds.size === donations.length}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Donor</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Method</th>
                                <th className="px-6 py-3">Campaign</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                            {donations.map(d => (
                                <tr key={d.DonationID} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-3">
                                        <input
                                            type="checkbox"
                                            className="rounded bg-zinc-800 border-zinc-600 focus:ring-emerald-500 text-emerald-500"
                                            checked={selectedIds.has(d.DonationID)}
                                            onChange={() => toggleSelection(d.DonationID)}
                                        />
                                    </td>
                                    <td className="px-6 py-3 font-mono text-xs">{new Date(d.GiftDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-3">
                                        <Link href={`/people/${d.DonorID}`} className="text-white hover:underline font-medium">
                                            {d.FirstName} {d.LastName}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-3 font-mono text-white">${Number(d.GiftAmount).toFixed(2)}</td>
                                    <td className="px-6 py-3">{d.GiftMethod}</td>
                                    <td className="px-6 py-3 text-xs">
                                        {d.CampaignID ? <span className="bg-white/10 px-2 py-0.5 rounded">{d.CampaignID}</span> : <span className="text-gray-600">General</span>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button
                                            onClick={() => handleMarkSent([d.DonationID], 'ThankYou')}
                                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wide border border-emerald-500/30 px-3 py-1 rounded hover:bg-emerald-500/10 transition-colors"
                                        >
                                            Mark Sent
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
