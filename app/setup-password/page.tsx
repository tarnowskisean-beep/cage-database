
"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SetupPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setResult({ success: false, message: 'No token provided in URL.' });
            return;
        }
        if (password !== confirm) {
            setResult({ success: false, message: 'Passwords do not match.' });
            return;
        }
        if (password.length < 8) {
            setResult({ success: false, message: 'Password must be at least 8 characters.' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/setup-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();

            if (res.ok) {
                setResult({ success: true, message: 'Password set successfully! Redirecting to login...' });
                setTimeout(() => {
                    router.push('/login?message=password_set');
                }, 2000);
            } else {
                setResult({ success: false, message: data.error || 'Failed to set password.' });
            }
        } catch (err) {
            console.error(err);
            setResult({ success: false, message: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ color: 'var(--color-error)' }}>
                Invalid Link. Please double check the URL from your email.
            </div>
        );
    }

    if (result?.success) {
        return (
            <div style={{ textAlign: 'center', color: '#4ade80' }}>
                <h3>Success!</h3>
                <p>{result.message}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '350px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Welcome</h1>
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Please set your secure password to continue.
            </p>

            {result && !result.success && (
                <div style={{ background: 'rgba(255,0,0,0.1)', color: 'var(--color-error)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {result.message}
                </div>
            )}

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>New Password</label>
                <input
                    type="password"
                    className="input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ width: '100%' }}
                />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password</label>
                <input
                    type="password"
                    className="input-field"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    style={{ width: '100%' }}
                />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                {loading ? 'Setting Password...' : 'Set Password & Login'}
            </button>
        </form>
    );
}

export default function SetupPasswordPage() {
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)',
            backgroundImage: 'radial-gradient(circle at top right, rgba(0,255,127,0.05), transparent 40%)'
        }}>
            <Suspense fallback={<div>Loading...</div>}>
                <SetupPasswordForm />
            </Suspense>
        </div>
    );
}
