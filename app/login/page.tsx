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
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">
            {/* Subtle Texture/Gradient for background interest without color */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent)] pointer-events-none" />

            <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md p-8 flex flex-col items-center">
                <div className="text-center mb-12">
                    {/* Compass Logo - White */}
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-white">
                        <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>

                    <h1 className="text-4xl font-display font-light tracking-wide text-white mb-2">
                        COMPASS
                    </h1>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-medium">
                        Professional
                    </p>
                </div>

                {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 p-4 mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="w-full space-y-6">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-medium">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#27272a] text-white px-4 py-3 rounded-sm outline-none focus:border-white focus:bg-[#27272a] transition-all placeholder-gray-700"
                            placeholder="Enter your username"
                            autoFocus
                            disabled={show2FA}
                        />
                    </div>

                    <div className={show2FA ? 'hidden' : 'block'}>
                        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-medium">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#27272a] text-white px-4 py-3 rounded-sm outline-none focus:border-white focus:bg-[#27272a] transition-all placeholder-gray-700"
                            placeholder="• • • • • • • •"
                            disabled={show2FA}
                        />
                    </div>

                    {show2FA && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <label className="block text-xs uppercase tracking-widest text-[#10b981] mb-2 font-medium">Authentication Code</label>
                            <input
                                type="text"
                                value={totp}
                                onChange={e => setTotp(e.target.value)}
                                placeholder="000 000"
                                className="w-full bg-[#18181b] border border-[#10b981] text-white px-4 py-3 rounded-sm outline-none text-center text-xl tracking-[0.2em]"
                                autoFocus
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-display font-medium uppercase tracking-widest py-4 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Authenticating...' : (show2FA ? 'Verify Access' : 'Sign In')}
                    </button>
                    {!show2FA && (
                        <div className="w-full text-center mt-2">
                            <span className="text-xs text-gray-500">Secure System Access &bull; Authorized Personnel Only</span>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
