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
                {/* Compass Logo - White - Large */}
                <div className="flex flex-col items-center select-none mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-display font-medium text-6xl text-white tracking-tight">C</span>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {/* Ring */}
                                <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="6" />
                                {/* Star Points */}
                                <path d="M50 0 L63 37 L100 50 L63 63 L50 100 L37 63 L0 50 L37 37 Z" fill="white" />
                                {/* Inner Detail */}
                                <circle cx="50" cy="50" r="8" fill="#09090b" />
                            </svg>
                        </div>
                        <span className="font-display font-medium text-6xl text-white tracking-tight">MPASS</span>
                    </div>
                    <div className="flex justify-between w-full text-xs uppercase text-gray-500 font-bold tracking-[0.4em] px-1">
                        <span>P</span><span>R</span><span>O</span><span>F</span><span>E</span><span>S</span><span>S</span><span>I</span><span>O</span><span>N</span><span>A</span><span>L</span>
                    </div>
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
