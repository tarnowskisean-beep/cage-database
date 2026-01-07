"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function MyAlertsPage() {
    const { data: session } = useSession();
    const [donations, setDonations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            fetchDonations((session.user as any).id);
        }
    }, [session]);

    const fetchDonations = async (userId: number) => {
        setLoading(true);
        try {
            // Fetch Assigned
            const assignedRes = await fetch(`/api/donations?assignedToUserId=${userId}`);
            const assignedData = assignedRes.ok ? await assignedRes.json() : [];

            // Fetch Flagged (For Client Review)
            // If user is admin/internal, maybe show all flagged? Or just fetch flagged generally?
            // Assuming we show flagged items to everyone for now, or filtered by client if we had client context.
            // Since we don't have client context easily here without session generic, we'll fetch all flagged for now 
            // and maybe relying on API to filter if we passed clientId (which we aren't yet).
            // Let's just fetch flagged items.
            const flaggedRes = await fetch(`/api/donations?isFlagged=true`);
            const flaggedData = flaggedRes.ok ? await flaggedRes.json() : [];

            // Merge and Dedup
            const all = [...assignedData, ...flaggedData];
            const unique = Array.from(new Map(all.map(item => [item.DonationID, item])).values());

            // Sort by Date
            unique.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());

            setDonations(unique);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (donationId: number) => {
        if (!confirm('Mark this item as resolved?')) return;
        try {
            const res = await fetch(`/api/donations/${donationId}/resolve`, { method: 'POST' });
            if (res.ok) {
                // Refresh list
                if (session?.user) fetchDonations((session.user as any).id);
            } else {
                alert('Failed to resolve');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading alerts...</div>;

    return (
        <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display text-white">My Alerts & Assignments</h3>
                <button
                    onClick={() => session?.user && fetchDonations((session.user as any).id)}
                    className="text-xs text-blue-400 hover:text-white transition-colors"
                >
                    Refresh
                </button>
            </div>

            {donations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No items assigned to you.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-gray-500 uppercase border-b border-white/10">
                                <th className="p-3">Status</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Donor</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Campaign</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {donations.map(d => (
                                <tr key={d.DonationID} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3">
                                        {d.IsFlagged && (
                                            <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase mr-2">
                                                Flagged
                                            </span>
                                        )}
                                        {d.AssignedToUserID === (session?.user as any)?.id && (
                                            <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                                                Assigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {new Date(d.GiftDate || d.CreatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-white font-medium">
                                        {d.DonorFirstName} {d.DonorLastName}
                                        <div className="text-xs text-gray-500">{d.DonorCity}, {d.DonorState}</div>
                                    </td>
                                    <td className="p-3 font-mono text-emerald-400">
                                        ${Number(d.GiftAmount).toFixed(2)}
                                    </td>
                                    <td className="p-3 text-sm text-gray-300">
                                        {d.CampaignID || '-'}
                                    </td>
                                    <td className="p-3 text-right flex items-center justify-end gap-3">
                                        {d.IsFlagged && (
                                            <button
                                                onClick={() => handleResolve(d.DonationID)}
                                                className="text-green-400 hover:text-green-300 text-xs font-bold uppercase tracking-wider hover:underline"
                                            >
                                                ✓ Resolve
                                            </button>
                                        )}
                                        <Link
                                            href={`/people/${d.DonationID}`}
                                            className="text-blue-400 hover:text-white text-xs font-bold uppercase tracking-wider hover:underline"
                                        >
                                            View &rarr;
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
