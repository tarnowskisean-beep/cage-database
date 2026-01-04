
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PersonProfile({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string>('');
    useEffect(() => { params.then(p => setId(p.id)); }, [params]);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/people/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load');
                return res.json();
            })
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-12 text-center text-gray-400">Loading Profile...</div>;
    if (!data) return <div className="p-12 text-center text-red-400">Profile Not Found</div>;

    const { profile, stats, history } = data;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link href="/people" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">&larr; Back to Directory</Link>

            {/* Profile Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {profile.FirstName?.[0]}{profile.LastName?.[0]}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.FirstName} {profile.LastName}</h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-5 text-center">📧</span> {profile.Email || 'No Email'}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-5 text-center">📍</span> {profile.Address ? `${profile.Address}, ${profile.City}, ${profile.State} ${profile.Zip}` : 'No Address'}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-5 text-center">📞</span> {profile.Phone || 'No Phone'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                            Donor ID: {profile.DonorID}
                        </span>
                    </div>
                </div>

                {/* Key Stats */}
                <div className="flex gap-8 border-l border-gray-100 pl-8">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Lifetime Value</p>
                        <p className="text-3xl font-bold text-green-700 font-mono">${Number(stats.totalGiven).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Gifts</p>
                        <p className="text-3xl font-bold text-gray-900 font-mono">{stats.giftCount}</p>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Donation History</h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                        <tr>
                            <th className="px-8 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Platform/Method</th>
                            <th className="px-6 py-4">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.map((h: any) => (
                            <tr key={h.DonationID} className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-4 text-gray-900 font-medium">
                                    {new Date(h.GiftDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-green-700">
                                    ${Number(h.GiftAmount).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-gray-700">
                                    {h.ClientName}
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {h.GiftPlatform} — {h.GiftMethod}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                                    {h.CheckNumber ? `Check #${h.CheckNumber}` : `Batch #${h.BatchID}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
