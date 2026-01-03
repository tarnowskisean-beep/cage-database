import React from 'react';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>SETTINGS</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Manage system users and configuration</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
                {/* Settings Sidebar */}
                <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a href="/settings/users" style={{
                        padding: '0.75rem 1rem', background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-active)', borderRadius: '4px',
                        color: 'var(--color-text-main)', fontWeight: 500, textDecoration: 'none'
                    }}>
                        Users
                    </a>
                    <a href="/settings/security" style={{
                        padding: '0.75rem 1rem', background: 'transparent',
                        border: '1px solid transparent', borderRadius: '4px',
                        color: 'var(--color-text-muted)', fontWeight: 500, textDecoration: 'none'
                    }}>
                        Security
                    </a>
                    {/* Placeholder for future settings */}
                    <div style={{
                        padding: '0.75rem 1rem', color: 'var(--color-text-muted)',
                        fontSize: '0.9rem', cursor: 'not-allowed'
                    }}>
                        Integrations
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
