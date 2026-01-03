'use client';

import { useState } from 'react';
import QRCode from 'qrcode';

export default function SecuritySettingsPage() {
    const [step, setStep] = useState<'init' | 'setup' | 'success'>('init');
    const [qrUrl, setQrUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');

    const startSetup = async () => {
        const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            setSecret(data.secret);
            const url = await QRCode.toDataURL(data.otpauth);
            setQrUrl(url);
            setStep('setup');
        } else {
            alert('Failed to start setup');
        }
    };

    const verifyAndEnable = async () => {
        const res = await fetch('/api/auth/2fa/setup', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, secret })
        });

        if (res.ok) {
            setStep('success');
        } else {
            setError('Invalid Code. Please try again.');
        }
    };

    return (
        <div style={{ padding: '1rem', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Security Settings</h2>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Two-Factor Authentication</h3>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Protect your account by requiring an additional code when logging in.
                </p>

                {step === 'init' && (
                    <button onClick={startSetup} className="btn-primary">
                        Enable 2FA
                    </button>
                )}

                {step === 'setup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
                            <img src={qrUrl} alt="2FA QR Code" width={200} height={200} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Scan this code with your authenticator app</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Secret: {secret}</p>
                        </div>

                        <div style={{ width: '100%' }}>
                            <input
                                className="input-field"
                                placeholder="Enter 6-digit code"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.2rem' }}
                            />
                            {error && <p style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>{error}</p>}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                            <button onClick={() => setStep('init')} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={verifyAndEnable} className="btn-primary" style={{ flex: 1 }}>Verify & Enable</button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>2FA Enabled!</h4>
                        <p style={{ color: 'var(--color-text-muted)' }}>Your account is now more secure.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
