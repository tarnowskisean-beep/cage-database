
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ResolutionQueue() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [processing, setProcessing] = useState<number | null>(null);

    const fetchQueue = () => {
        setLoading(true);
        fetch('/api/reconciliation/resolution-queue')
            .then(res => res.json())
            .then(data => {
                setItems(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleResolve = async (donationId: number, action: 'Link' | 'CreateNew', candidateId?: number) => {
        setProcessing(donationId);
        try {
            const res = await fetch('/api/reconciliation/resolution-queue/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donationId, action, candidateId })
            });

            if (res.ok) {
                // Remove from list locally for instant feedback
                setItems(prev => prev.filter(i => i.DonationID !== donationId));
            } else {
                alert('Failed to resolve item');
            }
        } catch (e) {
            console.error(e);
            alert('Error resolving item');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center text-gray-500 animate-pulse">Loading Queue...</div>;

    return (
        <div className="min-h-screen bg-[var(--color-bg-main)] text-white font-body p-8">
            <header className="max-w-5xl mx-auto mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-medium text-white tracking-tight">Identity Resolution</h1>
                    <p className="text-gray-400 mt-2 font-light">
                        Review high-confidence ambiguous matches.
                        <span className="ml-2 bg-yellow-900/30 text-yellow-500 px-2 py-0.5 rounded text-xs font-bold uppercase border border-yellow-800/50">
                            {items.length} Pending
                        </span>
                    </p>
                </div>
                <Link href="/reconciliation" className="text-sm text-gray-500 hover:text-white transition-colors">
                    &larr; Back to Reconciliation
                </Link>
            </header>

            <div className="max-w-5xl mx-auto space-y-8">
                {items.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-4xl mb-4">🎉</div>
                        <h2 className="text-xl font-bold text-white mb-2">All Clear!</h2>
                        <p className="text-gray-500">No ambiguous donations found.</p>
                        <Link href="/reconciliation" className="inline-block mt-6 px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors">
                            Return to Reconciliation
                        </Link>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.DonationID} className="bg-[#09090b] border border-white/10 rounded-xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex border-b border-white/5">
                                {/* LEFT: Donation Info */}
                                <div className="w-1/3 p-6 bg-white/5 border-r border-white/5">
                                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-widest">New Donation</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-2xl font-mono text-white mb-1 font-medium">
                                                {item.DonorFirstName} {item.DonorLastName}
                                            </div>
                                            <div className="text-sm text-yellow-400 font-mono">${parseFloat(item.GiftAmount).toFixed(2)}</div>
                                        </div>

                                        <div className="space-y-1 text-sm text-gray-400">
                                            {item.DonorEmail && <div className="flex items-center gap-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {item.DonorEmail}</div>}
                                            {item.DonorAddress && <div className="flex items-center gap-2"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> {item.DonorAddress}, {item.DonorZip}</div>}
                                            <div className="text-xs text-gray-600 mt-2 font-mono pt-2 border-t border-white/5">Received: {new Date(item.GiftDate).toLocaleDateString()}</div>
                                        </div>

                                        <button
                                            onClick={() => handleResolve(item.DonationID, 'CreateNew')}
                                            disabled={processing === item.DonationID}
                                            className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-xs font-bold uppercase tracking-wide border border-white/10 transition-colors disabled:opacity-50"
                                        >
                                            No Match - Create New
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT: Candidates */}
                                <div className="w-2/3 p-6 bg-[#09090b]">
                                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-widest flex justify-between">
                                        Suggested Matches
                                        <span className="text-emerald-500">Select one to link</span>
                                    </h3>

                                    <div className="space-y-3">
                                        {item.Candidates.map((c: any) => (
                                            <div
                                                key={c.CandidateID}
                                                className="group flex items-center justify-between p-4 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden"
                                                onClick={() => handleResolve(item.DonationID, 'Link', c.DonorID)}
                                            >
                                                {/* Score Bar */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-transparent opacity-50 group-hover:opacity-100"></div>

                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gray-400 font-mono font-bold text-sm border border-white/5">
                                                        {(c.Score * 100).toFixed(0)}%
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-medium text-lg group-hover:text-emerald-400 transition-colors">
                                                            {c.FirstName} {c.LastName}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-3">
                                                            <span>ID: {c.DonorID}</span>
                                                            {c.Email && <span className="text-gray-600">• {c.Email}</span>}
                                                            {c.Zip && <span className="text-gray-600">• {c.Zip}</span>}
                                                        </div>
                                                        <div className="text-xs text-emerald-500/70 mt-1 font-mono uppercase tracking-tight">
                                                            Matched on: {c.Reason}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    className="px-4 py-2 bg-white text-black text-xs font-bold uppercase rounded opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300"
                                                    disabled={processing === item.DonationID}
                                                >
                                                    Select Match
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
