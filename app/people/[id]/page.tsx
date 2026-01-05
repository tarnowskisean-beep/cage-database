'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function PeopleProfile({ params }: { params: Promise<{ id: string }> }) {
    const [donorId, setDonorId] = useState<string>('');
    useEffect(() => { params.then(p => setDonorId(p.id)); }, [params]);

    const [donor, setDonor] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!donorId) return;
        fetch(`/api/people/${donorId}`)
            .then(res => res.json())
            .then(data => {
                // FIXED: API returns 'profile' but frontend expected 'donor'
                setDonor(data.profile || data.donor);
                setStats(data.stats);
                setHistory(data.history || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [donorId]);

    // Prepare Chart Data
    const chartData = history.reduce((acc: any[], curr: any) => {
        const year = new Date(curr.GiftDate).getFullYear();
        const existing = acc.find(x => x.name === year);
        if (existing) {
            existing.amount += Number(curr.GiftAmount);
        } else {
            acc.push({ name: year, amount: Number(curr.GiftAmount) });
        }
        return acc;
    }, []).sort((a: any, b: any) => a.name - b.name);


    if (loading) return null; // Suspense-like loading, let layout handle background
    if (!donor) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-display text-white mb-2">Donor Not Found</h2>
                <p className="text-gray-500 mb-4">The requested donor profile could not be located.</p>
                <Link href="/people" className="btn-secondary">Return to Directory</Link>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">

            {/* Breadcrumb */}
            <nav className="mb-6">
                <Link href="/people" className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    &larr; Back to Directory
                </Link>
            </nav>

            {/* Profile Header Card */}
            <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 text-white flex items-center justify-center font-display text-3xl shadow-lg shrink-0">
                        {donor.FirstName?.[0]}{donor.LastName?.[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-4xl font-display text-white mb-2">{donor.FirstName} {donor.LastName}</h1>
                        <div className="flex flex-wrap gap-6 text-sm text-gray-400 mt-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">✉️</span>
                                {donor.Email || 'No Email'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">📞</span>
                                {donor.Phone || 'No Phone'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">📍</span>
                                {donor.City ? `${donor.City}, ${donor.State}` : 'No Location'}
                            </div>
                        </div>
                    </div>

                    {/* Quick Action */}
                    <div className="flex gap-2">
                        <a href={`/api/people/${donorId}/export`} target="_blank" className="btn-secondary">
                            Export History
                        </a>
                        <button className="btn-primary">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Impact Card */}
                <div className="glass-panel p-8 relative overflow-hidden group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 relative z-10">Lifetime Value</p>
                    <p className="text-5xl font-display text-white mt-2 relative z-10 font-medium">
                        ${Number(stats.totalGiven || 0).toLocaleString()}
                    </p>
                    <div className="mt-4 text-sm text-gray-400 relative z-10 border-t border-white/5 pt-4 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wider font-bold text-gray-600">Since {new Date(donor.CreatedAt).getFullYear()}</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                            Active Donor
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="glass-panel p-8 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-8 text-center divide-x divide-white/5">
                        <div>
                            <p className="text-3xl font-display text-white font-medium">{stats.giftCount}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-2 font-bold">Total Gifts</p>
                        </div>
                        <div>
                            <p className="text-3xl font-display text-white font-medium">${Number(stats.avgGift || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-2 font-bold">Avg Gift</p>
                        </div>
                    </div>
                </div>

                {/* Chart Card */}
                <div className="glass-panel p-6 flex flex-col justify-center">
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Yearly Giving</p>
                    </div>
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                                    {chartData.map((e, i) => (
                                        <Cell key={i} fill="#ffffff" fillOpacity={0.9} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* CRM Notes Section */}
            <div className="glass-panel p-6 mb-8">
                <h3 className="text-lg font-display text-white mb-4">Notes & Activity</h3>
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                    {/* Notes List */}
                    <NotesList donorId={donorId} />
                </div>
                {/* Add Note Form */}
                <AddNoteForm donorId={donorId} />
            </div>

            {/* Timeline / History Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--glass-border)] bg-white/5">
                    <h3 className="text-lg font-display text-white">Donation Timeline</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4 text-center">Batch</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-gray-500 italic">No donation history available.</td>
                                </tr>
                            ) : (
                                history.map((h: any) => (
                                    <tr key={h.DonationID} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 text-gray-300 font-mono text-xs">
                                            {new Date(h.GiftDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-white font-medium">
                                            {h.ClientCode || h.ClientName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {h.GiftMethod || 'Check'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-zinc-800 border border-zinc-700 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono tracking-wide">
                                                #{h.BatchID}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white font-medium">
                                            ${Number(h.GiftAmount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

function NotesList({ donorId }: { donorId: string }) {
    const [notes, setNotes] = useState<any[]>([]);

    useEffect(() => {
        if (!donorId) return;
        const fetchNotes = () => {
            fetch(`/api/people/${donorId}/notes`)
                .then(res => res.json())
                .then(setNotes)
                .catch(console.error);
        };
        fetchNotes();
        // Keep simple polling
        const interval = setInterval(fetchNotes, 5000);
        return () => clearInterval(interval);
    }, [donorId]);

    if (notes.length === 0) return <p className="text-gray-500 text-xs uppercase tracking-widest py-2">No notes recorded yet.</p>;

    return (
        <div className="space-y-3">
            {notes.map(note => (
                <div key={note.NoteID} className="bg-white/5 p-4 rounded border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-gray-200 text-sm">{note.Content}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                        <span>{note.AuthorName}</span>
                        <span>{new Date(note.CreatedAt).toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AddNoteForm({ donorId }: { donorId: string }) {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            await fetch(`/api/people/${donorId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            setContent('');
        } catch (e) {
            alert('Failed to add note');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type a new note..."
                className="input-field flex-1"
            />
            <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
            >
                Post Note
            </button>
        </form>
    );
}
