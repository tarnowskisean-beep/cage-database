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

    // Caging Activity Aggregation (MailCode + Method -> Count & Sum)
    const cagingActivity: Record<string, { count: number, sum: number }> = {};

    results.forEach(r => {
        // Extract MailCode from ScanString (Method B) or use raw MailCode if available
        let mailCode = r.MailCode || 'Unknown';
        if (r.ScanString && r.ScanString.includes('\t')) {
            mailCode = r.ScanString.split('\t')[0];
        } else if (!mailCode || mailCode === '') {
            mailCode = 'No Mail Code';
        }

        const method = r.GiftMethod || 'Unknown';
        const key = `${mailCode}::${method}`; // Composite key

        if (!cagingActivity[key]) cagingActivity[key] = { count: 0, sum: 0 };
        cagingActivity[key].count++;
        cagingActivity[key].sum += Number(r.GiftAmount || 0);
    });

    // Date Range Logic (Prioritize Query, Fallback to Data)
    let minDate = '-';
    let maxDate = '-';
    const qParam = searchParams.get('q');

    if (qParam) {
        try {
            const query = JSON.parse(decodeURIComponent(qParam));
            // Find Date Rules
            const findRule = (op: string) => {
                const rules = query.rules || [];
                // Simple search flattens rules, but let's check recursively if needed or just top level
                // Our SearchPage sends a simple AND list for dates at top level mostly.
                if (Array.isArray(rules)) {
                    const rule = rules.find((r: any) => r.field === 'date' && r.operator === op);
                    return rule ? rule.value : null;
                }
                return null;
            };

            const startQuery = findRule('gte');
            const endQuery = findRule('lte');

            if (startQuery) minDate = new Date(startQuery).toLocaleDateString();
            if (endQuery) maxDate = new Date(endQuery).toLocaleDateString();
        } catch (e) {
            console.error("Error parsing query dates", e);
        }
    }

    // Fallback if query didn't have dates (e.g. searched only by name)
    if (minDate === '-' || maxDate === '-') {
        const dates = results.map(r => new Date(r.GiftDate).getTime());
        if (minDate === '-' && dates.length) minDate = new Date(Math.min(...dates)).toLocaleDateString();
        if (maxDate === '-' && dates.length) maxDate = new Date(Math.max(...dates)).toLocaleDateString();
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black', background: 'white' }}>
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    @page { margin: 0.5cm; }
                }
            `}</style>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '0.25rem' }}>COMPASS</h1>
                    <div style={{ fontSize: '0.9rem', letterSpacing: '2px' }}>PROFESSIONAL</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <button
                        className="no-print"
                        onClick={() => window.print()}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        🖨️ Print / Save PDF
                    </button>
                    {client?.LogoURL ? (
                        <img src={client.LogoURL} alt="Client Logo" style={{ height: '60px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'serif' }}>
                            {client ? client.ClientCode : 'Multi-Client Report'}
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
                        {/* Breakdown by Method */}
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
            {/* BOTTOM: Caging Activity (Mailcode breakdown) */}
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', background: '#ccc', padding: '4px', border: '1px solid black' }}>
                Caging Activity (Matrix)
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '0.75rem' }}>
                <thead>
                    <tr style={{ background: '#eee' }}>
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Mail Code</th>
                        {/* Dynamic Method Columns */}
                        {Object.keys(methods).sort().map(m => (
                            <th key={m} colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{m}</th>
                        ))}
                        <th colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', background: '#ddd' }}>Total</th>
                    </tr>
                    <tr style={{ background: '#eee', fontSize: '0.7rem' }}>
                        <th style={{ border: '1px solid black', padding: '4px' }}></th>
                        {Object.keys(methods).sort().map(m => (
                            <>
                                <th key={`${m}-cnt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Cnt</th>
                                <th key={`${m}-amt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>$</th>
                            </>
                        ))}
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Cnt</th>
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>$</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Compute Unique MailCodes */}
                    {Array.from(new Set(results.map(r => {
                        if (r.ScanString && r.ScanString.includes('\t')) return r.ScanString.split('\t')[0];
                        return r.MailCode || 'No Mail Code';
                    }))).sort().map(mailCode => {
                        let rowCount = 0;
                        let rowSum = 0;

                        return (
                            <tr key={mailCode}>
                                <td style={{ border: '1px solid black', padding: '4px', fontWeight: 600 }}>{mailCode}</td>
                                {Object.keys(methods).sort().map(method => {
                                    const key = `${mailCode}::${method}`;
                                    const stats = cagingActivity[key] || { count: 0, sum: 0 };
                                    rowCount += stats.count;
                                    rowSum += stats.sum;

                                    return (
                                        <>
                                            <td key={`${method}-cnt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', color: stats.count ? 'black' : '#ccc' }}>
                                                {stats.count || '-'}
                                            </td>
                                            <td key={`${method}-amt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'right', color: stats.sum ? 'black' : '#ccc' }}>
                                                {stats.sum ? stats.sum.toFixed(2) : '-'}
                                            </td>
                                        </>
                                    );
                                })}
                                {/* Row Total */}
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{rowCount}</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{rowSum.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                    {/* Grand Total Row */}
                    <tr style={{ fontWeight: 'bold', background: '#f9f9f9', borderTop: '2px solid black' }}>
                        <td style={{ border: '1px solid black', padding: '4px' }}>Grand Total</td>
                        {Object.keys(methods).sort().map(m => (
                            <>
                                <td key={`${m}-tot-cnt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{methods[m].count}</td>
                                <td key={`${m}-tot-amt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{methods[m].sum.toFixed(2)}</td>
                            </>
                        ))}
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{count}</td>
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
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
