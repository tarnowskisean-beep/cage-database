"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function SecurityPage() {
    const { data: session } = useSession();
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Idle, 2=QR, 3=Success
    const [qrCode, setQrCode] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);

    const checkStatus = async () => {
        // In a real app we would check backend status. 
        // For now, next-auth session doesn't carry 2fa status unless we reload or add it to JWT.
        // Assuming "Not Enabled" initially.
    };

    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setQrCode(data.qrCodeUrl);
                setStep(2);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (res.ok) {
                setStep(3);
                alert('Two-Factor Authentication Enabled!');
            } else {
                alert('Invalid Code. Please try again.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1>Security Settings</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Manage your password and authentication preferences.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Two-Factor Authentication</h3>

                {step === 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-elevated)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                        }}>
                            🔐
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>Enable 2FA</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Scan a QR code with your authenticator app.</div>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleStartSetup}
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'Setup 2FA'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ marginBottom: '1rem' }}>Scan this QR code with Google Authenticator or Authy:</p>

                        <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <img src={qrCode} alt="2FA QR Code" width={200} height={200} />
                        </div>

                        <form onSubmit={handleVerify} style={{ maxWidth: '300px', margin: '0 auto' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>Enter 6-digit Code</label>
                            <input
                                className="input-field"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="123456"
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem' }}
                                required
                            />

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify & Enable'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', color: '#4ade80', padding: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h3>2FA is Enabled</h3>
                        <p style={{ color: 'var(--color-text-muted)' }}>Your account is now secured.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
