'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { NavItem } from './NavItem';

export default function Sidebar() {
    const pathname = usePathname() || '';
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { data: session } = useSession();

    // Hide sidebar on login page OR report page
    if (pathname === '/login' || pathname === '/search/report') return null;

    return (
        <aside
            className={`
                relative flex flex-col h-screen border-r border-[var(--glass-border)] bg-[#09090b] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50
                ${isCollapsed ? 'w-20' : 'w-72'}
            `}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 w-6 h-6 bg-[#27272a] border border-[#3f3f46] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-50 shadow-md"
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                >
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>

            {/* Brand Header */}
            <div className={`flex flex-col items-center justify-center py-6 ${isCollapsed ? 'px-2' : 'px-6'}`}>
                {isCollapsed ? (
                    /* Collapsed: Just the Compass Star Icon */
                    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="6" />
                        <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="white" />
                    </svg>
                ) : (
                    /* Expanded: Full Logo Type */
                    <div className="flex flex-col items-start leading-none select-none">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="font-display font-medium text-3xl text-white tracking-tight">C</span>
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* Ring */}
                                    <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="6" />
                                    {/* Star Points (North/South/East/West) */}
                                    <path d="M50 0 L63 37 L100 50 L63 63 L50 100 L37 63 L0 50 L37 37 Z" fill="white" />
                                    {/* Inner Detail */}
                                    <circle cx="50" cy="50" r="8" fill="#09090b" />
                                </svg>
                            </div>
                            <span className="font-display font-medium text-3xl text-white tracking-tight">MPASS</span>
                        </div>
                        <div className="flex justify-between w-full text-[0.65rem] uppercase text-white font-bold tracking-widest pl-1">
                            <span>P</span><span>R</span><span>O</span><span>F</span><span>E</span><span>S</span><span>S</span><span>I</span><span>O</span><span>N</span><span>A</span><span>L</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
                <ul className="space-y-1">
                    {/* Admin/Clerk specific tabs */}


                    {/* Dashboard/Search/People are allowed for ClientUser (Except original Dashboard link above was Admin only, need to fix) */}
                    {/* Actually, plan said ClientUser sees Dashboard. Let's restructure. */}

                    <NavItem href="/" icon="📊" label="Dashboard" active={pathname === '/'} collapsed={isCollapsed} />

                    {session?.user?.role !== 'ClientUser' && (
                        <>
                            <NavItem href="/clients" icon="🏢" label="Clients" active={pathname === '/clients'} collapsed={isCollapsed} />
                            <NavItem href="/import" icon="📥" label="Import Revenue" active={pathname.startsWith('/import')} collapsed={isCollapsed} />
                        </>
                    )}

                    <NavItem href="/batches" icon="📦" label="Batches" active={pathname.startsWith('/batches')} collapsed={isCollapsed} />

                    <NavItem href="/search" icon="🔍" label="Search" active={pathname === '/search'} collapsed={isCollapsed} />

                    {session?.user?.role !== 'ClientUser' && (
                        <>
                            <NavItem href="/reconciliation" icon="⚖️" label="Reconciliation" active={pathname === '/reconciliation'} collapsed={isCollapsed} />
                            <NavItem href="/journal" icon="📒" label="Journal Entries" active={pathname.startsWith('/journal')} collapsed={isCollapsed} />
                        </>
                    )}

                    <NavItem href="/people" icon="👥" label="People" active={pathname.startsWith('/people')} collapsed={isCollapsed} />


                </ul>
            </nav>

            {/* User Profile & Settings */}
            <div className={`mt-auto border-t border-[var(--glass-border)] bg-[#18181b]`}>
                {/* Settings Link - ADMIN ONLY */}
                {session?.user?.role === 'Admin' && (
                    <Link
                        href="/settings/mappings"
                        className={`flex items-center gap-4 px-6 py-4 text-gray-500 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="text-xl">⚙️</span>
                        {!isCollapsed && <span className="text-sm font-medium">System Settings</span>}
                    </Link>
                )}

                <div className={`p-4 ${isCollapsed ? 'flex justify-center' : ''}`}>
                    <div className={`
                        flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)]
                        bg-[#09090b]
                        ${isCollapsed ? 'justify-center p-2' : ''}
                    `}>
                        <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold text-sm shrink-0">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{session?.user?.role}</p>
                            </div>
                        )}
                        {!isCollapsed && (
                            <button
                                onClick={() => signOut()}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                title="Sign Out"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside >
    );
}
