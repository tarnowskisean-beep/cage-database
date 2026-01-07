'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AcknowledgementsPage() {
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [viewMode, setViewMode] = useState<'outstanding' | 'history'>('outstanding');
    const [searchTerm, setSearchTerm] = useState('');
    const [minAmount, setMinAmount] = useState('50');

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const fetchDonations = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterDateStart) params.set('start', filterDateStart);
        if (filterDateEnd) params.set('end', filterDateEnd);
        params.set('status', viewMode);
        params.set('minAmount', minAmount);

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
        // Debounce fetching when typing amount
        const timer = setTimeout(() => {
            fetchDonations();
        }, 500);
        return () => clearTimeout(timer);
    }, [filterDateStart, filterDateEnd, viewMode, minAmount]);

    // Local Filter for Search
    const displayedDonations = donations.filter(d => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            (d.FirstName || '').toLowerCase().includes(q) ||
            (d.LastName || '').toLowerCase().includes(q) ||
            (d.CampaignID || '').toLowerCase().includes(q) ||
            (d.DonationID.toString().includes(q))
        );
    });

    const handleMarkSent = async (ids: number[], type: 'ThankYou') => {
        if (!confirm(`Mark ${ids.length} donation(s) as Acknowledged?`)) return;

        try {
            await fetch('/api/people/acknowledgements/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, type })
            });
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
                    <h1 className="text-3xl font-display text-white">Acknowledgements</h1>
                    <p className="text-gray-400 mt-1">Manage thank you letters and receipts.</p>
                </div>

                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('outstanding')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'outstanding' ? 'bg-zinc-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Outstanding
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        History Log
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search */}
                    <div className="relative group w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-0 pl-9 py-2"
                            placeholder="Search list..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        {/* Date Filters */}
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-3 py-1.5">
                            <span className="text-xs text-gray-400 font-bold uppercase">Min $</span>
                            <input
                                type="number"
                                className="bg-transparent border-none text-sm text-white focus:ring-0 p-0 w-16 text-right font-mono"
                                value={minAmount}
                                onChange={e => setMinAmount(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-3 py-1.5">
                            <span className="text-xs text-gray-400 font-bold uppercase">Date Range</span>
                            <input
                                type="date"
                                className="bg-transparent border-none text-sm text-white focus:ring-0 p-0"
                                value={filterDateStart}
                                onChange={e => setFilterDateStart(e.target.value)}
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="date"
                                className="bg-transparent border-none text-sm text-white focus:ring-0 p-0"
                                value={filterDateEnd}
                                onChange={e => setFilterDateEnd(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {viewMode === 'outstanding' && selectedIds.size > 0 && (
                        <button
                            onClick={() => handleMarkSent(Array.from(selectedIds), 'ThankYou')}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-emerald-500 animate-in fade-in"
                        >
                            Mark {selectedIds.size} Sent
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (displayedDonations.length === 0) return;
                            const headers = ['DonationID', 'Date', 'Amount', 'FirstName', 'LastName', 'Address', 'City', 'State', 'Zip', 'Email', 'Campaign', 'Comment', 'AckDate'];
                            const csv = [
                                headers.join(','),
                                ...displayedDonations.map(d => [
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
                                    `"${d.Comment || ''}"`,
                                    d.ThankYouSentAt ? new Date(d.ThankYouSentAt).toLocaleDateString() : ''
                                ].join(','))
                            ].join('\n');

                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `acknowledgements_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                        className="btn-secondary flex items-center gap-2"
                        disabled={displayedDonations.length === 0}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                    <button onClick={fetchDonations} className="btn-secondary">Refresh</button>
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                {/* Removed old filter date div */}

                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse">Loading donations...</div>
                ) : displayedDonations.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg text-white mb-2">
                            {viewMode === 'outstanding' ? '🎉 All Caught Up!' : 'No History Found'}
                        </p>
                        <p>
                            {viewMode === 'outstanding' ? 'No outstanding acknowledgements found.' : 'No acknowledged donations found for this period.'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider bg-white/5">
                                {viewMode === 'outstanding' && (
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded bg-zinc-800 border-zinc-600 focus:ring-emerald-500 text-emerald-500"
                                            checked={displayedDonations.length > 0 && selectedIds.size === displayedDonations.length}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Donor</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Method</th>
                                <th className="px-6 py-3">Campaign</th>
                                {viewMode === 'history' && <th className="px-6 py-3">Ack Date</th>}
                                {viewMode === 'outstanding' && <th className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                            {displayedDonations.map(d => (
                                <tr key={d.DonationID} className="hover:bg-white/5 transition-colors group">
                                    {viewMode === 'outstanding' && (
                                        <td className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded bg-zinc-800 border-zinc-600 focus:ring-emerald-500 text-emerald-500"
                                                checked={selectedIds.has(d.DonationID)}
                                                onChange={() => toggleSelection(d.DonationID)}
                                            />
                                        </td>
                                    )}
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
                                    {viewMode === 'history' && (
                                        <td className="px-6 py-3 text-xs font-mono text-emerald-500">
                                            {d.ThankYouSentAt ? new Date(d.ThankYouSentAt).toLocaleDateString() : '-'}
                                        </td>
                                    )}
                                    {viewMode === 'outstanding' && (
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => handleMarkSent([d.DonationID], 'ThankYou')}
                                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wide border border-emerald-500/30 px-3 py-1 rounded hover:bg-emerald-500/10 transition-colors"
                                            >
                                                Mark Sent
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
