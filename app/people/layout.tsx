
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [stats, setStats] = useState({ review: 0, acknowledgements: 0, alerts: 0, directory: 0 });

    useEffect(() => {
        fetch('/api/people/stats')
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setStats(prev => ({ ...prev, ...data }));
                }
            })
            .catch(console.error);
    }, [pathname]); // Re-fetch on navigation (e.g. after resolving item)

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="mb-8">
                <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">CRM</h2>
                <h1 className="text-4xl text-white font-display">People</h1>

                {/* Tabs */}
                <div className="flex gap-1 mt-6 border-b border-white/10">
                    <Link
                        href="/people"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people'
                            ? 'border-white text-white'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Directory
                        {stats.directory > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-400">
                                {stats.directory.toLocaleString()}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/people/resolution"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people/resolution'
                            ? 'border-yellow-500 text-yellow-500' // Distinctive color for this tab
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Client Review queue
                        {stats.review > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pathname === '/people/resolution' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-900/30 text-yellow-600 group-hover:text-yellow-500'}`}>
                                {stats.review}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/people/alerts"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people/alerts'
                            ? 'border-red-500 text-red-500' // Red for alerts (matches dashboard)
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        My Alerts
                        {stats.alerts > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pathname === '/people/alerts' ? 'bg-red-500/20 text-red-300' : 'bg-red-900/30 text-red-600 group-hover:text-red-500'}`}>
                                {stats.alerts}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/people/acknowledgements"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people/acknowledgements'
                            ? 'border-emerald-500 text-emerald-500'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Acknowledgements
                        {stats.acknowledgements > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pathname === '/people/acknowledgements' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-900/30 text-emerald-600 group-hover:text-emerald-500'}`}>
                                {stats.acknowledgements}
                            </span>
                        )}
                    </Link>
                </div>
            </header>

            {/* Child content (Directory or Queue) */}
            <div className="animate-in fade-in zoom-in-95 duration-300">
                {children}
            </div>
        </div>
    );
}
