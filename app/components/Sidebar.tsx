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
        <aside style={{
            width: isCollapsed ? '80px' : 'var(--sidebar-width)',
            background: 'var(--color-bg-sidebar)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            position: 'relative',
            flexShrink: 0
        }}>
            {/* Collapse Toggle */}
            <button
                onClick={toggleSidebar}
                style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '20px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'var(--color-primary-text)',
                    border: '2px solid var(--color-bg-base)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                }}
            >
                {isCollapsed ? '→' : '←'}
            </button>

            {/* Brand Header */}
            <div style={{ padding: '2rem 1.5rem', marginBottom: '1rem', textAlign: 'center', opacity: isCollapsed ? 0.8 : 1 }}>
                <div style={{
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'center',
                    transform: isCollapsed ? 'scale(0.8)' : 'scale(1)',
                    transition: 'transform 0.3s ease'
                }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="24" cy="24" r="23" stroke="white" strokeWidth="1.5" />
                        <path d="M24 8L27 21L40 24L27 27L24 40L21 27L8 24L21 21L24 8Z" fill="white" />
                    </svg>
                </div>
                {!isCollapsed && (
                    <>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 400, letterSpacing: '0.1em', color: 'var(--color-text-main)', marginBottom: '0.25rem', fontFamily: 'var(--font-display)' }}>
                            COMPASS
                        </h1>
                        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>
                            PROFESSIONAL
                        </p>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '0 1rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                </ul>
            </nav>

            {/* User Profile & Settings */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)' }}>
                {/* Settings Link - ADMIN ONLY */}
                {session?.user?.role === 'Admin' && (
                    <Link href="/settings/mappings" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem',
                        color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'all 0.2s',
                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>⚙️</span>
                        {!isCollapsed && <span style={{ fontSize: '0.9rem' }}>Settings</span>}
                    </Link>
                )}

                {/* User Info */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-primary-text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0
                    }}>
                        {session?.user?.name ? session.user.name.slice(0, 1).toUpperCase() : 'AG'}
                    </div>

                    {!isCollapsed && (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-main)' }}>
                                {session?.user?.name || 'Alyssa Graham'}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{session?.user?.role || 'Clerk'}</span>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--color-error)',
                                        fontSize: '0.7rem', cursor: 'pointer', padding: 0,
                                        textDecoration: 'none', fontFamily: 'inherit'
                                    }}
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
            <Link href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-none)',
                color: active ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderLeft: active ? '2px solid var(--color-primary)' : '2px solid transparent'
            }}>
                <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                {!collapsed && <span style={{ fontWeight: 400 }}>{label}</span>}
            </Link>
        </li>
    );
}
