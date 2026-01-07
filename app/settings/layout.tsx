"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>SETTINGS</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Manage system users and configuration</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', height: '100%', alignItems: 'flex-start' }}>
                {/* Settings Sidebar */}
                <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    <SettingsLink href="/settings/users" label="User Management" active={isActive('/settings/users')} icon="👥" />
                    <SettingsLink href="/settings/assignment-rules" label="Assignment Rules" active={isActive('/settings/assignment-rules')} icon="📋" />
                    <SettingsLink href="/settings/security" label="Security" active={isActive('/settings/security')} icon="🔒" />
                    <SettingsLink href="/settings/mappings" label="Import Mappings" active={isActive('/settings/mappings')} icon="🔄" />
                    <SettingsLink href="/settings/export-templates" label="Export Templates" active={isActive('/settings/export-templates')} icon="📤" />

                    {/* Placeholder for future settings */}
                    <div style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-muted)',
                        fontSize: '0.9rem', cursor: 'not-allowed', marginTop: '1rem',
                        borderTop: '1px solid var(--color-border)', paddingTop: '1rem'
                    }}>
                        Integrations (Coming Soon)
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function SettingsLink({ href, label, active, icon }: { href: string, label: string, active: boolean, icon: string }) {
    return (
        <Link href={href} style={{
            padding: '0.75rem 1rem',
            background: active ? 'var(--color-bg-surface)' : 'transparent',
            border: active ? '1px solid var(--color-active)' : '1px solid transparent',
            borderRadius: '6px',
            color: active ? 'var(--color-text-main)' : 'var(--color-text-muted)',
            fontWeight: active ? 600 : 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s ease'
        }}>
            <span>{icon}</span>
            <span>{label}</span>
        </Link>
    );
}
