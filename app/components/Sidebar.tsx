"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside style={{
            width: isCollapsed ? '80px' : '280px',
            background: 'var(--color-bg-sidebar)',
            borderRight: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            position: 'relative',
            flexShrink: 0
        }}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '20px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: '2px solid var(--color-bg-base)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    boxShadow: 'var(--shadow-sm)'
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
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.1em', color: 'white', marginBottom: '0.25rem', fontFamily: '"Cinzel", serif' }}>
                            COMPASS
                        </h1>
                        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#94a3b8', textTransform: 'uppercase', fontFamily: '"Cinzel", serif' }}>
                            PROFESSIONAL
                        </p>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '0 1rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavLink href="/" icon="📊" label="Dashboard" active={pathname === '/'} collapsed={isCollapsed} />
                    <NavLink href="/clients" icon="🏢" label="Clients" active={pathname === '/clients'} collapsed={isCollapsed} />
                    <NavLink href="/batches" icon="📦" label="Batches" active={pathname.startsWith('/batches')} collapsed={isCollapsed} />
                    <NavLink href="/search" icon="🔍" label="Search" active={pathname === '/search'} collapsed={isCollapsed} />
                    <NavLink href="/reconciliation" icon="⚖️" label="Reconciliation" active={pathname === '/reconciliation'} collapsed={isCollapsed} />
                </ul>
            </nav>

            {/* User Profile */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', flexShrink: 0 }}></div>
                <div style={{
                    marginTop: 'auto',
                    padding: '1rem',
                    borderTop: '1px solid var(--color-border-subtle)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: isCollapsed ? 'center' : 'start' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: 'white', color: 'black',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'
                        }}>
                            {session?.user?.name ? session.user.name.slice(0, 1).toUpperCase() : 'AG'}
                        </div>

                        {!isCollapsed && (
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {session?.user?.name || 'Alyssa Graham'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {session?.user?.email ? 'Clerk' : 'Clerk'}
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#f87171',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        padding: '0',
                                        marginTop: '0.25rem',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Sign Out
                                </button>
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
                borderRadius: '0.5rem',
                color: active ? 'white' : '#94a3b8',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
                justifyContent: collapsed ? 'center' : 'flex-start'
            }}>
                <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                {!collapsed && <span style={{ fontWeight: 500 }}>{label}</span>}
            </Link>
        </li>
    );
}
