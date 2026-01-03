'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Types (Mirrors Search Page)
interface SearchResult {
    DonationID: number;
    GiftAmount: number;
    GiftMethod: string;
    GiftPlatform: string;
    ClientCode: string;
    ClientID: number;
    CreatedAt: string; // date
    GiftDate: string;
    ScanString?: string;
    MailCode?: string; // Derived
    // ... other needed fields
}

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
    LogoURL?: string;
}

function ReportContent() {
    const searchParams = useSearchParams();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<Client | null>(null);

    useEffect(() => {
        const qParam = searchParams.get('q');
        if (!qParam) {
            setLoading(false);
            return;
        }

        const fetchReportData = async () => {
            try {
                // 1. Re-run Search
                const query = JSON.parse(decodeURIComponent(qParam));
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(query)
                });
                const data = await res.json();
                const rows = Array.isArray(data) ? data : [];
                setResults(rows);

                // 2. Check for Single Client
                const uniqueClientIDs = Array.from(new Set(rows.map((r: any) => r.ClientID).filter(Boolean)));
                if (uniqueClientIDs.length === 1) {
                    // Fetch Client Details for Logo
                    const clientRes = await fetch('/api/clients'); // Ideally /api/clients/:id but we have list
                    const clients = await clientRes.json();
                    const match = clients.find((c: Client) => c.ClientID === uniqueClientIDs[0]);
                    if (match) setClient(match);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [searchParams]);

    if (loading) return <div className="p-8">Generating Report...</div>;

    // --- AGGREGATION LOGIC ---
    const totalAmount = results.reduce((sum, r) => sum + Number(r.GiftAmount || 0), 0);
    const count = results.length;

    // Platform Stats
    const platforms: Record<string, { count: number, sum: number }> = {};
    const methods: Record<string, { count: number, sum: number }> = {};

    results.forEach(r => {
        const p = r.GiftPlatform || 'Unknown';
        if (!platforms[p]) platforms[p] = { count: 0, sum: 0 };
        platforms[p].count++;
        platforms[p].sum += Number(r.GiftAmount || 0);

        const m = r.GiftMethod || 'Unknown';
        if (!methods[m]) methods[m] = { count: 0, sum: 0 };
        methods[m].count++;
        methods[m].sum += Number(r.GiftAmount || 0);
    });

    // Date Range (Simple min/max)
    const dates = results.map(r => new Date(r.GiftDate).getTime());
    const minDate = dates.length ? new Date(Math.min(...dates)).toLocaleDateString() : '-';
    const maxDate = dates.length ? new Date(Math.max(...dates)).toLocaleDateString() : '-';

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black', background: 'white' }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '0.25rem' }}>COMPASS</h1>
                    <div style={{ fontSize: '0.9rem', letterSpacing: '2px' }}>PROFESSIONAL</div>
                </div>
                <div>
                    {client?.LogoURL ? (
                        <img src={client.LogoURL} alt="Client Logo" style={{ height: '60px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'serif' }}>
                            {/* Fallback or specific branding? User screenshot showed 'CPI'. We'll leave blank or show ClientCode if no logo. */}
                            {client ? client.ClientCode : 'Mutli-Client Report'}
                        </div>
                    )}
                </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
                Weekly Contributions Report
            </h2>
            <div style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
                Report Date: {new Date().toLocaleDateString()} <br />
                Account: {client ? `${client.ClientName} (${client.ClientCode})` : 'All Accounts'}
            </div>

            {/* MAIN GRIDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* LEFT: Activity Window */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Activity Window:</th>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{minDate} - {maxDate}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px' }}>Total Record Count:</td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{count}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px' }}>Total Amount:</td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${totalAmount.toFixed(2)}</td>
                        </tr>
                        {/* Breakdown by Method (simplified from screenshot for now) */}
                        {Object.entries(methods).map(([m, stats]) => (
                            <tr key={m}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{m} Total:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${stats.sum.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* RIGHT: Platform Totals */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Platform Totals:</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(platforms).map(([p, stats]) => (
                            <tr key={p}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>Total $ of {p}:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${stats.sum.toFixed(2)}</td>
                            </tr>
                        ))}
                        {Object.entries(platforms).map(([p, stats]) => (
                            <tr key={p + 'count'}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>Total # of {p}:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{stats.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BOTTOM: Caging Activity (Mailcode breakdown) */}
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', background: '#ccc', padding: '4px', border: '1px solid black' }}>
                Caging Activity
            </h3>
            {/* ... Assuming grouped by mailcode logic, complicated to do on frontend without pre-processing. 
                For now, showing raw list or simplified. User screenshot shows Mailcode grouping.
                Let's approximate it. 
            */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '0.75rem' }}>
                <thead>
                    <tr style={{ background: '#eee' }}>
                        <th style={{ border: '1px solid black', padding: '4px' }}>Date</th>
                        <th style={{ border: '1px solid black', padding: '4px' }}>Donor</th>
                        <th style={{ border: '1px solid black', padding: '4px' }}>Platform</th>
                        <th style={{ border: '1px solid black', padding: '4px' }}>Method</th>
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {results.slice(0, 50).map(r => (
                        <tr key={r.DonationID}>
                            <td style={{ border: '1px solid black', padding: '2px' }}>{new Date(r.GiftDate).toLocaleDateString()}</td>
                            <td style={{ border: '1px solid black', padding: '2px' }}>{r.ClientCode}</td>
                            <td style={{ border: '1px solid black', padding: '2px' }}>{r.GiftPlatform}</td>
                            <td style={{ border: '1px solid black', padding: '2px' }}>{r.GiftMethod}</td>
                            <td style={{ border: '1px solid black', padding: '2px', textAlign: 'right' }}>${Number(r.GiftAmount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {results.length > 50 && <div style={{ textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>...and {results.length - 50} more records (truncated for print preview)</div>}
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div>Loading Report...</div>}>
            <ReportContent />
        </Suspense>
    );
}
