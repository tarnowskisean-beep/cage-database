
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function PolicyEnforcement() {
    const { data: session } = useSession();
    const [policies, setPolicies] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session) return;
        checkPolicies();
    }, [session]);

    const checkPolicies = async () => {
        try {
            const res = await fetch('/api/auth/policies');
            const data = await res.json();
            if (data.needsAcceptance && data.policies?.length > 0) {
                setPolicies(data.policies);
                setOpen(true);
            }
        } catch (e) {
            console.error('Policy check failed', e);
        }
    };

    const handleAccept = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policyIds: policies.map(p => p.PolicyID) })
            });
            if (res.ok) {
                setOpen(false); // Close
            } else {
                alert('Failed to process acceptance. Please try again.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-panel" style={{ width: '600px', maxWidth: '95vw', padding: '2rem', background: 'var(--color-bg-surface)' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-main)' }}>Policy Update Required</h2>
                <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                    To continue using Compass CPA, you must review and accept the latest policies.
                </p>

                <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '2rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    {policies.map(p => (
                        <div key={p.PolicyID} style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{p.PolicyType} (v{p.Version})</h3>
                            <div
                                style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--color-text-subtle)' }}
                                dangerouslySetInnerHTML={{ __html: p.Content }}
                            />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        className="btn-primary"
                        onClick={handleAccept}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Processing...' : 'I Accept These Policies'}
                    </button>
                </div>
            </div>
        </div>
    );
}
