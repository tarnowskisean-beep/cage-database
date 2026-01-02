"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside style={{
            width: isCollapsed ? '80px' : '280px',
            background: 'hsl(var(--color-bg-sidebar))',
            borderRight: '1px solid hsla(var(--color-border), 0.1)',
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
                    background: 'hsl(var(--color-primary))',
                    color: 'white',
                    border: '2px solid hsl(var(--color-bg-base))',
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
            <div style={{ padding: '1.5rem', borderTop: '1px solid hsla(var(--color-border), 0.1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', flexShrink: 0 }}></div>
                {!isCollapsed && (
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 500, color: 'white', whiteSpace: 'nowrap' }}>Alyssa Graham</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Clerk</div>
                    </div>
                )}
            </div>
        </aside>
    );
}

function NavLink({ href, icon, label, active, collapsed }: { href: string, icon: string, label: string, active: boolean, collapsed: boolean }) {
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
