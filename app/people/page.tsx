
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
                <div className="w-full h-64 animate-pulse bg-white/5 rounded"></div>
            ) : donors.length === 0 ? (
                <div className="py-32 text-center border border-dashed border-gray-800 rounded">
                    <p className="text-gray-500">No Donors Found</p>
                </div>
            ) : (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#222] text-gray-500 font-medium uppercase tracking-wider text-xs border-b border-gray-800">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-center">Gifts</th>
                                <th className="px-6 py-4 text-right">Lifetime Value</th>
                                <th className="px-6 py-4 text-right">Last Gift</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {donors.map(d => (
                                <tr key={d.DonorID} className="hover:bg-[#222] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center font-bold text-xs border border-gray-700">
                                                {d.FirstName?.[0]}{d.LastName?.[0]}
                                            </div>
                                            <span className="font-semibold text-white">{d.FirstName} {d.LastName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        <div>{d.Email || '-'}</div>
                                        <div>{d.Phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {d.City ? `${d.City}, ${d.State}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-400 font-mono">
                                        {d.TotalGifts}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-white">
                                        ${Number(d.LifetimeValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                                        {d.LastGiftDate ? new Date(d.LastGiftDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/people/${d.DonorID}`} className="text-[var(--color-accent)] hover:underline text-xs font-bold uppercase tracking-wide">
                                            View
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
        <Suspense fallback={<div className="min-h-screen bg-[#2A2829] flex items-center justify-center text-gray-500">Loading directory...</div>}>
            <PeopleContent />
        </Suspense>
    );
}
