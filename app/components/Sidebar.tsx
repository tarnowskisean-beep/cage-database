"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useSidebar } from '@/app/hooks/useSidebar';

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();

    if (pathname === '/login') return null;

    return (
        <aside className={`h-screen sticky top-0 flex flex-col border-r border-[var(--glass-border)] bg-[rgba(15,23,42,0.4)] backdrop-blur-xl transition-all duration-300 z-50 ${isCollapsed ? 'w-20' : 'w-[280px]'}`}>

            {/* Collapse Toggle */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-400 transition-colors z-50 ring-2 ring-[#0f172a]"
            >
                {isCollapsed ? '→' : '←'}
            </button>

            {/* Brand Header */}
            <div className={`p-6 flex flex-col items-center justify-center transition-all duration-300 ${isCollapsed ? 'mb-4' : 'mb-8'}`}>
                <div className={`transition-transform duration-300 ${isCollapsed ? 'scale-75' : 'scale-100'}`}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(192,160,98,0.3)]">
                        <circle cx="24" cy="24" r="23" stroke="#C0A062" strokeWidth="1.5" />
                        <path d="M24 8L27 21L40 24L27 27L24 40L21 27L8 24L21 21L24 8Z" fill="#C0A062" />
                    </svg>
                </div>
                {!isCollapsed && (
                    <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h2 className="text-xl font-bold tracking-[0.15em] font-display text-white">
                            COMPASS
                        </h2>
                        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-[#C0A062] block mt-1">
                            Professional Services
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">
                <ul className="space-y-2">
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
            <div className={`mt-auto border-t border-[var(--glass-border)] bg-black/10`}>
                {/* Settings Link - ADMIN ONLY */}
                {session?.user?.role === 'Admin' && (
                    <Link
                        href="/settings/mappings"
                        className={`flex items-center gap-4 px-6 py-4 text-gray-400 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <span className="text-xl">⚙️</span>
                        {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
                    </Link>
                )}

                {/* User Info */}
                <div className={`p-4 border-t border-[var(--glass-border)] flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shrink-0">
                        {session?.user?.name ? session.user.name.slice(0, 1).toUpperCase() : 'AG'}
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-white truncate">
                                {session?.user?.name || 'Alyssa Graham'}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{session?.user?.role || 'Clerk'}</span>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase font-bold tracking-wide"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, active, collapsed }: { href: string, icon: string, label: string, active: boolean, collapsed: boolean }) {
    return (
        <li>
            <Link
                href={href}
                className={`
                    group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
                    ${active
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/5 border border-transparent'}
                    ${collapsed ? 'justify-center px-2' : ''}
                `}
            >
                <span className={`text-xl transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {icon}
                </span>
                {!collapsed && (
                    <span className={`font-medium text-sm tracking-wide ${active ? 'text-white' : ''}`}>
                        {label}
                    </span>
                )}
            </Link>
        </li>
    );
}
