
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="mb-8">
                <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">CRM</h2>
                <h1 className="text-4xl text-white font-display">People</h1>

                {/* Tabs */}
                <div className="flex gap-1 mt-6 border-b border-white/10">
                    <Link
                        href="/people"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pathname === '/people'
                            ? 'border-white text-white'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Directory
                    </Link>
                    <Link
                        href="/people/resolution"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people/resolution'
                            ? 'border-yellow-500 text-yellow-500' // Distinctive color for this tab
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Client Review queue
                    </Link>
                    <Link
                        href="/people/acknowledgements"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${pathname === '/people/acknowledgements'
                            ? 'border-emerald-500 text-emerald-500'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                            }`}
                    >
                        Acknowledgements
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
