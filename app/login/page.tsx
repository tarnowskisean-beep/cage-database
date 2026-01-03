'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [totp, setTotp] = useState('');
    const [show2FA, setShow2FA] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            username,
            password,
            totp,
            redirect: false,
        });

        if (res?.error) {
            if (res.error === '2FA_REQUIRED') {
                setShow2FA(true);
                setError('Authentication code required');
            } else if (res.error === 'INVALID_2FA') {
                setError('Invalid code');
                setShow2FA(true);
            } else {
                setError('Invalid credentials');
            }
            setLoading(false);
        } else {
            router.push('/'); // Redirect to dashboard
            router.refresh();
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Background is handled by body but we ensure transparency here if needed or overlay
            position: 'relative',
            zIndex: 1
        }}>
            <form onSubmit={handleSubmit} style={{
                background: 'transparent',
                padding: '4rem 2rem',
                width: '100%',
                maxWidth: '440px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    {/* Replaced logo SVG with a simple typographic treatment or keeping abstract if preferred. 
                        Compass uses a specific circular logo but we'll stick to the text for brand match */ }
                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>
                        <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Simplified geometric logo */}
                            <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1" />
                            <path d="M24 10L26 22L38 24L26 26L24 38L22 26L10 24L22 22L24 10Z" fill="currentColor" />
                        </svg>
                    </div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 400,
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.02em',
                        marginBottom: '0.5rem',
                        color: 'var(--color-text-main)'
                    }}>
                        COMPASS
                    </h1>
                    <p style={{
                        fontSize: '0.8rem',
                        letterSpacing: '0.25em',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 300
                    }}>
                        PROFESSIONAL
                    </p>
                </div>

                {error && (
                    <div style={{
                        width: '100%',
                        background: 'rgba(255, 77, 79, 0.1)',
                        color: 'var(--color-error)',
                        padding: '1rem',
                        marginBottom: '2rem',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        border: '1px solid var(--color-error)'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                    <label style={{
                        display: 'block', fontSize: '0.75rem', marginBottom: '0.75rem',
                        color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
                        fontFamily: 'var(--font-body)'
                    }}>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="input-field"
                        style={{
                            background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '0',
                            padding: '1rem', fontSize: '1rem', color: 'var(--color-text-main)', width: '100%',
                            outline: 'none', fontFamily: 'var(--font-body)'
                        }}
                        autoFocus
                        disabled={show2FA}
                    />
                </div>

                <div style={{ marginBottom: show2FA ? '1.5rem' : '3rem', width: '100%' }}>
                    <label style={{
                        display: 'block', fontSize: '0.75rem', marginBottom: '0.75rem',
                        color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
                        fontFamily: 'var(--font-body)'
                    }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field"
                        style={{
                            background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '0',
                            padding: '1rem', fontSize: '1rem', color: 'var(--color-text-main)', width: '100%',
                            outline: 'none', fontFamily: 'var(--font-body)'
                        }}
                        disabled={show2FA}
                    />
                </div>

                {show2FA && (
                    <div style={{ marginBottom: '3rem', width: '100%' }}>
                        <label style={{
                            display: 'block', fontSize: '0.75rem', marginBottom: '0.75rem',
                            color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
                            fontFamily: 'var(--font-body)'
                        }}>Authentication Code</label>
                        <input
                            type="text"
                            value={totp}
                            onChange={e => setTotp(e.target.value)}
                            placeholder="6-digit code"
                            className="input-field"
                            style={{
                                background: 'transparent', border: '1px solid var(--color-primary)', borderRadius: '0',
                                padding: '1rem', fontSize: '1.2rem', color: 'var(--color-text-main)', width: '100%',
                                outline: 'none', fontFamily: 'var(--font-body)', textAlign: 'center', letterSpacing: '0.2em'
                            }}
                            autoFocus
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        background: 'var(--color-primary)',
                        color: 'var(--color-primary-text)',
                        border: 'none',
                        padding: '1.25rem',
                        fontFamily: 'var(--font-body)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'opacity 0.2s ease'
                    }}
                >
                    {loading ? 'AUTHENTICATING...' : (show2FA ? 'VERIFY' : 'ENTER')}
                </button>

                {/* Temporary Troubleshoot Button */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm('This will repair the database structure and reset the admin password. Continue?')) return;
                            try {
                                const res = await fetch('/api/dev/seed-user', { method: 'POST' });
                                const text = await res.text();
                                try {
                                    const data = JSON.parse(text);
                                    alert(data.message || JSON.stringify(data));
                                } catch (err) {
                                    alert(`Failed to parse JSON. Status: ${res.status}. Response: ${text.substring(0, 100)}...`);
                                }
                            } catch (e) {
                                alert('Network Error: ' + e);
                            }
                        }}
                        style={{
                            background: 'none',
                            border: '1px dashed #666',
                            color: '#888',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                        }}
                    >
                        Troubleshoot: Repair Database
                    </button>
                </div>
            </form>
        </div>
    );
}
