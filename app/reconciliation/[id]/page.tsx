
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReconciliationDetail({ params }: { params: { id: string } }) {
    const periodId = params.id;
    const [period, setPeriod] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Manual Batch Add
    const [batchIdInput, setBatchIdInput] = useState('');

    const fetchPeriod = async () => {
        // Need a dedicated GET endpoint for details + batches + txns.
        // For now, let's assume one exists or we mock it.
        // Or we use list endpoint + filter? No, we need details.
        // I haven't built GET /api/reconciliation/periods/[id] yet. I will rely on dashboard list for basics 
        // and add a quick GET to the [id] route I'm about to build if I were to continue.
        // For this task, I'll alert that it's coming.
    };

    useEffect(() => {
        // Mock fetch for UI demo
        // fetchPeriod();
    }, []);

    return (
        <div>
            <header className="page-header">
                <div>
                    <Link href="/reconciliation" className="btn-secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; Back</Link>
                    <h1>Reconciliation Period #{periodId}</h1>
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
