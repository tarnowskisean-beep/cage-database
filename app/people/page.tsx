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
                    <h2 className="text-sm font-medium tracking-wide text-blue-400 uppercase mb-2">CRM</h2>
                    <h1 className="text-5xl font-display text-white tracking-tight font-bold drop-shadow-md">Donor Directory</h1>
                    <p className="text-gray-400 mt-2 max-w-xl text-lg font-light">Manage your donor relationships and view lifetime value analytics across all clients.</p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-end">
                    {/* Filters */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min Giving ($)"
                            className="input-field w-32"
                            value={minAmount}
                            onChange={e => setMinAmount(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="City"
                            className="input-field w-32"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                        />
                    </div>

                    <div className="relative group flex-1 md:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="input-field pl-12 pr-4 w-full md:w-80"
                            placeholder="Search donors..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn-primary shadow-lg hover:shadow-blue-500/20">
                        Search
                    </button>
                </form>
            </header>

            {/* Content Area */}
            {loading ? (
                <div className="w-full h-64 animate-pulse glass-panel flex items-center justify-center">
                    <div className="text-gray-500 font-medium">Loading network...</div>
                </div>
            ) : donors.length === 0 ? (
                <div className="py-32 text-center border border-dashed border-gray-700 rounded-xl bg-white/5">
                    <div className="text-4xl mb-4">👥</div>
                    <p className="text-gray-400 text-lg">No Donors Found</p>
                    <p className="text-sm text-gray-600">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="glass-panel p-0 overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Location</th>
                                <th className="text-center">Gifts</th>
                                <th className="text-right">Lifetime Value</th>
                                <th className="text-right">Last Gift</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {donors.map(d => (
                                <tr key={d.DonorID} className="group transition-colors">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/10 shadow-inner">
                                                {d.FirstName?.[0]}{d.LastName?.[0]}
                                            </div>
                                            <span className="font-semibold text-white group-hover:text-blue-300 transition-colors">{d.FirstName} {d.LastName}</span>
                                        </div>
                                    </td>
                                    <td className="text-gray-400 text-xs">
                                        <div className="mb-0.5">{d.Email || '-'}</div>
                                        <div>{d.Phone}</div>
                                    </td>
                                    <td className="text-gray-400">
                                        {d.City ? `${d.City}, ${d.State}` : '-'}
                                    </td>
                                    <td className="text-center text-blue-300 font-mono font-medium bg-blue-500/5 py-1 rounded">
                                        {d.TotalGifts}
                                    </td>
                                    <td className="text-right font-mono text-emerald-400 font-medium">
                                        ${Number(d.LifetimeValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="text-right text-gray-500 text-xs font-mono">
                                        {d.LastGiftDate ? new Date(d.LastGiftDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <Link href={`/people/${d.DonorID}`} className="text-blue-400 hover:text-white text-xs font-bold uppercase tracking-wide hover:underline decoration-blue-500 decoration-2 underline-offset-4">
                                            View Profile &rarr;
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

export default function PeopleDirectory() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-blue-400 animate-pulse">Loading directory...</div>}>
            <PeopleContent />
        </Suspense>
    );
}
