
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';



function PeopleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    const initialMin = searchParams.get('min') || '';
    const initialCity = searchParams.get('city') || '';

    // Local state for input to avoid re-fetching on every keystroke
    const [searchTerm, setSearchTerm] = useState(q);
    const [minAmount, setMinAmount] = useState(initialMin);
    const [city, setCity] = useState(initialCity);

    const [donors, setDonors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Debounce search? Or just fetch on mount + when q changes
        setLoading(true);
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (initialMin) params.set('min', initialMin);
        if (initialCity) params.set('city', initialCity);

        fetch(`/api/people?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setDonors(data.data || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [q, initialMin, initialCity]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (minAmount) params.set('min', minAmount);
        if (city) params.set('city', city);

        router.push(`/people?${params.toString()}`);
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* Header Section */}
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-[var(--color-accent)] uppercase mb-2">CRM</h2>
                    <h1 className="text-5xl font-display text-white tracking-tight">Donor Directory</h1>
                    <p className="text-gray-400 mt-2 max-w-xl text-lg font-light">Manage your donor relationships and view lifetime value analytics across all clients.</p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">

                    {/* Filters */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min Giving ($)"
                            className="bg-[#1f1f1f] border border-[var(--color-border)] rounded text-white px-4 py-3 w-32 outline-none focus:border-[var(--color-accent)] text-xs"
                            value={minAmount}
                            onChange={e => setMinAmount(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="City"
                            className="bg-[#1f1f1f] border border-[var(--color-border)] rounded text-white px-4 py-3 w-32 outline-none focus:border-[var(--color-accent)] text-xs"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                        />
                    </div>

                    <div className="relative group flex-1 md:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--color-accent)] transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="bg-[#1f1f1f] border border-[var(--color-border)] rounded text-white px-12 py-3 w-full md:w-80 outline-none focus:border-[var(--color-accent)] transition-all placeholder-gray-600 font-light"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="bg-[var(--color-accent)] text-black px-6 py-3 rounded font-bold uppercase tracking-wide hover:bg-white transition-colors shadow-[0_0_10px_rgba(192,160,98,0.2)]">
                        Search
                    </button>
                </form>
            </header>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="glass-panel h-64 animate-pulse bg-white/5 border-transparent"></div>
                    ))}
                </div>
            ) : donors.length === 0 ? (
                <div className="py-32 text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#1f1f1f] text-gray-700 text-4xl mb-6">∅</div>
                    <h3 className="text-xl text-white font-display mb-2">No Donors Found</h3>
                    <p className="text-gray-500">Try adjusting your search criteria</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {donors.map(d => (
                        <Link href={`/people/${d.DonorID}`} key={d.DonorID} className="group">
                            <div className="glass-panel p-6 h-full flex flex-col relative transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-[var(--color-border)] hover:border-[var(--color-accent)]">

                                {/* Header / Avatar */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#333] to-[#111] border border-[#444] text-white flex items-center justify-center font-display text-xl shadow-lg group-hover:from-[var(--color-accent)] group-hover:to-[#8a723e] group-hover:text-black transition-all duration-500">
                                        {d.FirstName?.[0]}{d.LastName?.[0]}
                                    </div>
                                    {/* Rank Badge (Mock Logic) */}
                                    {Number(d.LifetimeValue) > 5000 && (
                                        <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                            Top Donor
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[var(--color-accent)] transition-colors line-clamp-1">
                                    {d.FirstName} {d.LastName}
                                </h3>

                                {/* Details */}
                                <div className="space-y-3 mt-4 flex-1">
                                    <div className="flex items-center text-xs text-gray-500">
                                        <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        <span className="truncate">{d.Email || 'No Email'}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <span className="truncate">{d.City ? `${d.City}, ${d.State}` : 'Unknown Location'}</span>
                                    </div>
                                </div>

                                {/* Metrics Footer */}
                                <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Lifetime</p>
                                        <p className="text-base font-mono text-white group-hover:text-white transition-colors">
                                            ${Number(d.LifetimeValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Gifts</p>
                                        <p className="text-base font-mono text-white">{d.TotalGifts}</p>
                                    </div>
                                </div>

                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PeopleDirectory() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-gray-500">Loading directory...</div>}>
            <PeopleContent />
        </Suspense>
    );
}
