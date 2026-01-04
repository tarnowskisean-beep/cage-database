
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReconciliationDashboard() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState('');

    useEffect(() => {
        // Fetch Clients
        fetch('/api/clients').then(res => res.json()).then(setClients).catch(console.error);
    }, []);

    useEffect(() => {
        // Fetch Periods
        let url = '/api/reconciliation/periods?';
        if (selectedClient) url += `clientId=${selectedClient}`;

        setLoading(true);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setPeriods(Array.isArray(data) ? data : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedClient]);

    const handleCreatePeriod = async () => {
        if (!selectedClient) return alert('Select a client first');
        const end = prompt("Enter Period End Date (Friday):", new Date().toISOString().slice(0, 10));
        if (!end) return;

        // Auto-calculate start (Monday)
        const d = new Date(end);
        const day = d.getDay(); // 5 = Friday
        if (day !== 5) {
            if (!confirm("Warning: Period End Date is not a Friday. Continue?")) return;
        }

        const start = new Date(d);
        start.setDate(d.getDate() - 4); // Monday
        const startStr = start.toISOString().slice(0, 10);

        try {
            const res = await fetch('/api/reconciliation/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: selectedClient, startDate: startStr, endDate: end })
            });

            if (res.ok) {
                const json = await res.json();
                window.location.reload();
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            alert('Failed to create period');
        }
    };

    return (
        <div>
            <header className="page-header">
                <div>
                    <h1>Weekly Cash Reconciliation</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Track weekly batches, reconcile with bank, and schedule transfers.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select
                        className="input-field"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        style={{ minWidth: '200px' }}
                    >
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>)}
                    </select>
                    <button className="btn-primary" onClick={handleCreatePeriod}>+ New Period</button>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: 0 }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
                ) : periods.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No reconciliation periods found. Create one to get started.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Period (Mon-Fri)</th>
                                <th>Transfer Date</th>
                                <th>Status</th>
                                <th>Total Net</th>
                                <th>Bank Verified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map(p => (
                                <tr key={p.ReconciliationPeriodID}>
                                    <td style={{ fontWeight: 600 }}>{p.ClientName}</td>
                                    <td>
                                        {new Date(p.PeriodStartDate).toLocaleDateString()} - {new Date(p.PeriodEndDate).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {new Date(p.ScheduledTransferDate).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${p.Status.toLowerCase().replace(' ', '-')}`}>
                                            {p.Status}
                                        </span>
                                    </td>
                                    <td>${Number(p.TotalPeriodAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td>
                                        {p.BankBalanceVerified ? '✅' : '❌'}
                                    </td>
                                    <td>
                                        <Link href={`/reconciliation/${p.ReconciliationPeriodID}`} style={{ color: 'var(--color-primary)' }}>
                                            Manage &rarr;
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
