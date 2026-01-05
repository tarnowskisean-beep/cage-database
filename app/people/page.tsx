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
                // Handle both { data: [...] } and direct array [...] responses, and error objects
                const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
                setDonors(list);
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
        <div className="max-w-[1600px] mx-auto px-6 py-8">

            {/* Header Section */}
            <header className="page-header flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">CRM</h2>
                    <h1 className="text-4xl text-white font-display">Donor Directory</h1>
                    <p className="text-gray-500 font-light text-base mt-2">Manage your donor relationships and view analytics.</p>
                </div>

                <form onSubmit={handleSearch} className="glass-panel p-2 flex flex-col md:flex-row gap-2 items-center w-full md:w-auto">
                    {/* Main Search */}
                    <div className="relative group w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            className="w-full bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 pl-9 py-2"
                            placeholder="Search by name, email, or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-6 bg-white/10 mx-2"></div>

                    {/* Filters Row */}
                    <div className="flex w-full md:w-auto gap-2">
                        {/* City Filter */}
                        <div className="relative flex-1 md:w-40 bg-white/5 rounded hover:bg-white/10 transition-colors">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="City"
                                className="w-full bg-transparent border-none text-xs text-white placeholder-gray-500 focus:ring-0 pl-9 py-2"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                            />
                        </div>

                        {/* Min Amount Filter */}
                        <div className="relative flex-1 md:w-32 bg-white/5 rounded hover:bg-white/10 transition-colors">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                                $
                            </div>
                            <input
                                type="number"
                                placeholder="Min Giving"
                                className="w-full bg-transparent border-none text-xs text-white placeholder-gray-500 focus:ring-0 pl-7 py-2"
                                value={minAmount}
                                onChange={e => setMinAmount(e.target.value)}
                            />
                        </div>

                        {/* Submit Button (Icon) */}
                        <button type="submit" className="px-4 bg-white text-black rounded hover:bg-gray-200 transition-colors flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>
                </form>
            </header>

            {/* Content Area */}
            {loading ? (
                <div className="w-full h-64 animate-pulse glass-panel flex items-center justify-center">
                    <div className="text-gray-500 font-medium text-xs uppercase tracking-widest">Loading network...</div>
                </div>
            ) : donors.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-zinc-900 rounded bg-white/5">
                    <p className="text-gray-500">No Donors Found</p>
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
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-gray-400 flex items-center justify-center font-bold text-xs border border-zinc-700">
                                                {d.FirstName?.[0]}{d.LastName?.[0]}
                                            </div>
                                            <span className="font-semibold text-white group-hover:text-white transition-colors">{d.FirstName} {d.LastName}</span>
                                        </div>
                                    </td>
                                    <td className="text-gray-500 text-xs">
                                        <div className="mb-0.5">{d.Email || '-'}</div>
                                        <div>{d.Phone}</div>
                                    </td>
                                    <td className="text-gray-500">
                                        {d.City ? `${d.City}, ${d.State}` : '-'}
                                    </td>
                                    <td className="text-center text-gray-300 font-mono font-medium">
                                        {d.TotalGifts}
                                    </td>
                                    <td className="text-right font-mono text-emerald-500 font-medium">
                                        ${Number(d.LifetimeValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="text-right text-gray-500 text-xs font-mono">
                                        {d.LastGiftDate ? new Date(d.LastGiftDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <Link href={`/people/${d.DonorID}`} className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wide">
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

export default function PeopleDirectory() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 animate-pulse">Loading directory...</div>}>
            <PeopleContent />
        </Suspense>
    );
}
