'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
                setDonor(data.donor);
                setStats(data.stats);
                setHistory(data.history || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [donorId]);

    // Prepare Chart Data
    // Group history by year for a simple chart
    const chartData = history.reduce((acc: any[], curr: any) => {
        const year = new Date(curr.DonationDate).getFullYear();
        const existing = acc.find(x => x.name === year);
        if (existing) {
            existing.amount += Number(curr.Amount);
        } else {
            acc.push({ name: year, amount: Number(curr.Amount) });
        }
        return acc;
    }, []).sort((a: any, b: any) => a.name - b.name);


    if (loading) return <div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-gray-500 animate-pulse">Loading profile...</div>;
    if (!donor) return <div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-red-500">Donor not found</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* Breadcrumb */}
            <nav className="mb-8">
                <Link href="/people" className="text-gray-500 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Directory
                </Link>
            </nav>

            {/* Profile Header Card */}
            <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--color-accent)] to-transparent opacity-10 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#333] to-[#111] border-2 border-[var(--color-accent)] text-white flex items-center justify-center font-display text-4xl shadow-2xl shrink-0">
                        {donor.FirstName?.[0]}{donor.LastName?.[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-4xl font-display text-white mb-2">{donor.FirstName} {donor.LastName}</h1>
                        <div className="flex flex-wrap gap-6 text-sm text-gray-400 mt-4">
                            <div className="flex items-center gap-2">
                                <span className="bg-white/10 p-2 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></span>
                                {donor.Email}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-white/10 p-2 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></span>
                                {donor.Phone || 'No Phone'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-white/10 p-2 rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span>
                                {donor.City}, {donor.State}
                            </div>
                        </div>
                    </div>

                    {/* Quick Action */}
                    <div>
                        <button className="bg-[var(--color-bg-elevated)] hover:bg-white hover:text-black border border-[var(--color-border)] text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Impact Card */}
                <div className="glass-panel p-8 relative overflow-hidden group">
                    {/* Gold glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent"></div>

                    <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest mb-1 relative z-10">Lifetime Value</p>
                    <p className="text-5xl font-display text-white mt-2 relative z-10 shadow-black drop-shadow-lg">
                        ${Number(stats.totalGiven || 0).toLocaleString()}
                    </p>
                    <div className="mt-4 text-sm text-gray-400 relative z-10 border-t border-[var(--color-accent)]/20 pt-4 flex justify-between">
                        <span>Since {new Date(donor.CreatedAt).getFullYear()}</span>
                        <span className="text-[var(--color-accent)]">Top 10%</span>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="glass-panel p-8 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-8 text-center">
                        <div>
                            <p className="text-3xl font-display text-white">{stats.giftCount}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Gifts</p>
                        </div>
                        <div>
                            <p className="text-3xl font-display text-white">${Number(stats.avgGift || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Avg Gift</p>
                        </div>
                    </div>
                </div>

                {/* Chart Card */}
                <div className="glass-panel p-6 flex flex-col justify-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Giving History (By Year)</p>
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                                    {chartData.map((e, i) => (
                                        <Cell key={i} fill="var(--color-accent)" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Timeline / History Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--color-border)] bg-[#1f1f1f]">
                    <h3 className="text-xl font-display text-white">Donation Timeline</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1a1a1a] text-gray-500 uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4 text-center">Batch</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-subtle)]">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-8 text-center text-gray-500">No donation history found.</td>
                                </tr>
                            ) : (
                                history.map((h: any) => (
                                    <tr key={h.DonationID} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 text-white font-medium">
                                            {new Date(h.DonationDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {h.ClientCode}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {h.DonationType || 'Check'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-white/10 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                                                #{h.BatchID}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[var(--color-accent)]">
                                            ${Number(h.Amount).toFixed(2)}
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
