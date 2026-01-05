'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-main)] text-white font-body p-6">
            <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-xl">
                <span className="text-4xl text-red-500">⚠️</span>
            </div>
            <h2 className="text-3xl font-display font-bold mb-2">Something went wrong!</h2>
            <p className="text-gray-400 mb-8 max-w-md text-center">
                An unexpected error occurred. Our team has been notified.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-2.5 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
                >
                    Try again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2.5 bg-transparent border border-gray-600 text-gray-300 font-semibold rounded hover:bg-white/5 transition-colors"
                >
                    Go Home
                </button>
            </div>
        </div>
    );
}
