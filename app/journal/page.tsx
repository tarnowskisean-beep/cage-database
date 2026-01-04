'use client';

export default function JournalPage() {
    return (
        <div className="min-h-screen bg-[#111] flex items-center justify-center p-8">
            <div className="max-w-2xl text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#1a1a1a] border border-dashed border-gray-700 text-yellow-500 text-4xl mb-8 animate-pulse">
                    ⚠️
                </div>
                <h1 className="text-4xl font-display text-white mb-4">Journal Entries Module</h1>
                <p className="text-xl text-gray-400 font-light mb-8">
                    This advanced accounting feature is currently under construction.
                    <br />
                    We are building a robust double-entry ledger system.
                </p>
                <div className="p-4 bg-[#1a1a1a] border border-gray-800 rounded text-sm text-gray-500 font-mono">
                    STATUS: PENDING DEVELOPMENT
                </div>
            </div>
        </div>
    );
}
