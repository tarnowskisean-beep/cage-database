
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';


function PeopleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';

    // Local state for input to avoid re-fetching on every keystroke
    const [searchTerm, setSearchTerm] = useState(q);
    const [donors, setDonors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Debounce search? Or just fetch on mount + when q changes
        setLoading(true);
        fetch(`/api/people?q=${encodeURIComponent(q)}`)
            .then(res => res.json())
            .then(data => {
                setDonors(data.data || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [q]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.push(`/people?q=${encodeURIComponent(searchTerm)}`);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Donor Directory</h1>
                    <p className="text-gray-500 mt-1">Search and manage donor profiles.</p>
                </div>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Search name, email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        Search
                    </button>
                </form>
            </header>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading directory...</div>
                ) : donors.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No donors found. Try a different search.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-center">Total Gifts</th>
                                <th className="px-6 py-4 text-right">Lifetime Value</th>
                                <th className="px-6 py-4 text-right">Last Gift</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {donors.map(d => (
                                <tr key={d.DonorID} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {d.FirstName?.[0]}{d.LastName?.[0]}
                                            </div>
                                            {d.FirstName} {d.LastName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <div className="truncate max-w-[200px]" title={d.Email}>{d.Email}</div>
                                        <div className="text-xs text-gray-400">{d.Phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {d.City}, {d.State}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
                                            {d.TotalGifts}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-green-700">
                                        ${Number(d.LifetimeValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {d.LastGiftDate ? new Date(d.LastGiftDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/people/${d.DonorID}`}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            View Profile &rarr;
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default function PeopleDirectory() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading directory...</div>}>
            <PeopleContent />
        </Suspense>
    );
}
