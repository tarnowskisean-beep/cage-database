"use client";

import { useSession } from "next-auth/react";

export default function SecurityPage() {
    const { data: session } = useSession();

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1>Security Settings</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Manage your password and authentication preferences.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Two-Factor Authentication</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                    }}>
                        🔐
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>Status: Not Enabled</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Protect your account with an extra layer of security.</div>
                    </div>
                    <button className="btn-primary" disabled>Enable 2FA</button>
                </div>
            </div>
        </div>
    );
}
