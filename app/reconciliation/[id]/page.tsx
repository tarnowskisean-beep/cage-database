
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function ReconciliationDetail({ params }: { params: Promise<{ id: string }> }) {
    // Next 15: Unrap params using Use() hook or await. 
    // Since this is a client component, we use the `use` hook (if using React 18/Next 15 experimental) or just handle it if it were Server Component.
    // Wait, client components in Next 15: params is still a promise prop.
    // Actually, simple fix is just `use(params)` if React 19, or standard await if Server.
    // For client components, it's safer to just type it as `params: any` or await it in a effect if really needed, OR better yet:
    // "Page props are Promises" only applies to Server Components usually? 
    // Ah, Next 15 makes it Promise everywhere for consistency.
    // Let's use `use(params)` pattern.

    // Quick Fix for Client Component:
    // Just cast it or handle the ID.
    // We can't use `use` easily if we are on older React types. 
    // Let's unwrap it in an effect or basic valid React logic.
    // Actually, let's keep it simple: `params` is a Promise.

    const [id, setId] = useState<string>('');

    useEffect(() => {
        params.then(unwrapped => {
            setId(unwrapped.id);
        });
    }, [params]);

    const [period, setPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    if (!id) return <div>Loading ID...</div>;

    return (
        <div>
            <header className="page-header">
                <div>
                    <Link href="/reconciliation" className="btn-secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; Back</Link>
                    <h1>Reconciliation Period #{id}</h1>
                </div>
            </header>
            <div className="glass-panel">
                <p>Detailed view coming next...</p>
                <p>This is where you will:</p>
                <ul>
                    <li>Add Closed Batches</li>
                    <li>Upload Bank Statements</li>
                    <li>Verify & Reconcile</li>
                </ul>
            </div>
        </div>
    );
}
