'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-main)] text-white font-body p-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800 shadow-xl">
                <span className="text-4xl">🤔</span>
            </div>
            <h2 className="text-3xl font-display font-bold mb-2">Page Not Found</h2>
            <p className="text-gray-400 mb-8 max-w-md text-center">
                We couldn't find the page you were looking for. It might have been moved or doesn't exist.
            </p>
            <Link
                href="/"
                className="px-6 py-2.5 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
