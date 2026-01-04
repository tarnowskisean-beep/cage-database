'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { data: session } = useSession();

    // Hide sidebar on login page OR report page
    if (pathname === '/login' || pathname === '/search/report') return null;

    const NavItem = ({ href, icon, label, active, collapsed }: { href: string, icon: string, label: string, active: boolean, collapsed: boolean }) => (
        <li>
            <Link
                href={href}
                className={`
                    group flex items-center gap-4 px-4 py-3 mx-2 rounded-md transition-all duration-200
                    ${active
                        ? 'bg-white text-black font-semibold shadow-lg shadow-white/5'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                    ${collapsed ? 'justify-center mx-1 px-2' : ''}
                `}
                title={collapsed ? label : undefined}
            >
                <span className={`text-xl transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </span>
                {!collapsed && (
                    <span className="text-sm tracking-wide">{label}</span>
                )}
                {/* Active Indicator Dot */}
                {!collapsed && active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black"></span>
                )}
            </Link>
        </li>
    );

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
            <div className={`flex items-center gap-4 p-6 ${isCollapsed ? 'justify-center px-2' : ''}`}>
                <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                    {/* Abstract Compass Logo - White/Monochrome */}
                    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
                            stroke="white"
                            strokeWidth="2"
                        />
                        <path
                            d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z"
                            fill="white"
                        />
                    </svg>
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-display font-bold text-lg tracking-tight text-white whitespace-nowrap">
                            COMPASS
                        </span>
                        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-gray-500 font-medium whitespace-nowrap">
                            PROFESSIONAL
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
                <ul className="space-y-1">
                    {/* Admin/Clerk specific tabs */}
                    {session?.user?.role !== 'ClientUser' && (
                        <>
                            <NavItem href="/" icon="📊" label="Dashboard" active={pathname === '/'} collapsed={isCollapsed} />
                            <NavItem href="/clients" icon="🏢" label="Clients" active={pathname === '/clients'} collapsed={isCollapsed} />
                        </>
                    )}

                    {/* Shared tabs */}
                    <NavItem href="/batches" icon="📦" label="Batches" active={pathname.startsWith('/batches')} collapsed={isCollapsed} />

                    {/* Admin/Clerk specific tabs */}
                    {session?.user?.role !== 'ClientUser' && (
                        <NavItem href="/import" icon="📥" label="Import Revenue" active={pathname.startsWith('/import')} collapsed={isCollapsed} />
                    )}

                    {/* Shared tabs */}
                    <NavItem href="/search" icon="🔍" label="Search" active={pathname === '/search'} collapsed={isCollapsed} />

                    {/* Admin/Clerk specific tabs */}
                    {session?.user?.role !== 'ClientUser' && (
                        <NavItem href="/reconciliation" icon="⚖️" label="Reconciliation" active={pathname === '/reconciliation'} collapsed={isCollapsed} />
                    )}

                    <NavItem href="/journal" icon="📒" label="Journal Entries" active={pathname.startsWith('/journal')} collapsed={isCollapsed} />

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
        </aside>
    );
}
